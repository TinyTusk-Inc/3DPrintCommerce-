# Secrets Management — HashiCorp Vault

## Why Vault

- **Self-hosted now**: Run Vault OSS on your own server, full control, free
- **Cloud migration later**: Point `VAULT_ADDR` at HCP Vault (HashiCorp's managed cloud) or swap the client for AWS Secrets Manager — your app code stays the same
- **Audit log**: Every secret read/write is logged with who, what, and when
- **Dynamic secrets**: Vault can generate short-lived DB credentials on demand (advanced, optional)
- **Encryption at rest**: Secrets are encrypted in Vault's storage backend

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Your Server                        │
│                                                      │
│  ┌──────────────┐        ┌─────────────────────┐    │
│  │  Node.js App │──────▶ │   Vault Server       │    │
│  │              │  fetch │   (port 8200)        │    │
│  │  AppRole     │  secrets│                     │    │
│  │  auth        │◀──────  │  KV secrets engine  │    │
│  └──────────────┘        └─────────────────────┘    │
│                                    │                 │
│                           Encrypted storage          │
│                           (file / PostgreSQL)        │
└─────────────────────────────────────────────────────┘

Future cloud migration: change VAULT_ADDR to HCP Vault endpoint
— zero app code changes required
```

---

## Part 1: Install & Run Vault Server

### Option A — Docker (recommended, matches your existing stack)

Add to your `docker-compose.yml`:

```yaml
vault:
  image: hashicorp/vault:1.17
  container_name: vault
  restart: unless-stopped
  ports:
    - "8200:8200"
  environment:
    VAULT_DEV_ROOT_TOKEN_ID: "root"          # DEV MODE ONLY — not for production
    VAULT_DEV_LISTEN_ADDRESS: "0.0.0.0:8200"
  cap_add:
    - IPC_LOCK
  volumes:
    - vault_data:/vault/data
```

> **Dev mode** starts Vault unsealed with a root token — fine for local development.
> For production, use a proper config file (see Option B).

### Option B — Production Config File

Create `/etc/vault/config.hcl`:

```hcl
ui = true

storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1          # Enable TLS in production with a real cert
}

api_addr = "http://0.0.0.0:8200"
```

Run:
```bash
vault server -config=/etc/vault/config.hcl
```

Initialize (first time only):
```bash
export VAULT_ADDR=http://localhost:8200

# Initialize — saves 5 unseal keys and a root token
vault operator init

# Unseal (need 3 of 5 keys)
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>
```

> Store the unseal keys and root token somewhere safe (password manager, printed paper in a safe).
> You need 3 keys every time Vault restarts.

---

## Part 2: Store Your Secrets in Vault

```bash
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=<your_root_or_admin_token>

# Enable the KV v2 secrets engine
vault secrets enable -path=secret kv-v2

# Store all app secrets under secret/3dstore/
vault kv put secret/3dstore/app \
  JWT_SECRET="your_actual_jwt_secret" \
  JWT_EXPIRE="7d"

vault kv put secret/3dstore/database \
  DB_HOST="localhost" \
  DB_PORT="5432" \
  DB_NAME="ecommerce_3d_db" \
  DB_USER="postgres" \
  DB_PASSWORD="your_actual_db_password"

vault kv put secret/3dstore/razorpay \
  RAZORPAY_KEY_ID="your_key_id" \
  RAZORPAY_KEY_SECRET="your_key_secret" \
  RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"

vault kv put secret/3dstore/email \
  EMAIL_USER="your_email@gmail.com" \
  EMAIL_PASSWORD="your_app_password" \
  SENDGRID_API_KEY="your_sendgrid_key"

vault kv put secret/3dstore/oauth \
  GOOGLE_CLIENT_ID="your_google_client_id" \
  GOOGLE_CLIENT_SECRET="your_google_client_secret" \
  FACEBOOK_APP_ID="your_facebook_app_id" \
  FACEBOOK_APP_SECRET="your_facebook_app_secret"

vault kv put secret/3dstore/storage \
  AWS_ACCESS_KEY_ID="your_key" \
  AWS_SECRET_ACCESS_KEY="your_secret" \
  AWS_REGION="us-east-1" \
  AWS_S3_BUCKET="your_bucket"
```

---

## Part 3: Create an AppRole for the App

AppRole is how your Node.js app authenticates to Vault — it gets a role_id (like a username) and a secret_id (like a password).

```bash
# Enable AppRole auth
vault auth enable approle

# Create a policy that allows reading app secrets
vault policy write 3dstore-policy - <<EOF
path "secret/data/3dstore/*" {
  capabilities = ["read"]
}
EOF

# Create the AppRole
vault write auth/approle/role/3dstore-app \
  token_policies="3dstore-policy" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=0        # 0 = never expires; set a duration for stricter security

# Get the role_id (not secret — safe to store in .env)
vault read auth/approle/role/3dstore-app/role-id

# Generate a secret_id (treat like a password)
vault write -f auth/approle/role/3dstore-app/secret-id
```

Put only these two values in your production `.env` (not the actual secrets):

```env
VAULT_ADDR=http://localhost:8200
VAULT_ROLE_ID=<role_id from above>
VAULT_SECRET_ID=<secret_id from above>
```

---

## Part 4: Wire Vault into the Node.js Backend

Install the official Vault client:

```bash
cd backend && npm install node-vault@0.10.2
```

Create `backend/src/config/vault.js`:

```js
/**
 * Vault Client
 * Fetches secrets from HashiCorp Vault at app startup.
 * Falls back to process.env for local development (when VAULT_ADDR is not set).
 */

const vault = require('node-vault');

const VAULT_ADDR = process.env.VAULT_ADDR;
const VAULT_ROLE_ID = process.env.VAULT_ROLE_ID;
const VAULT_SECRET_ID = process.env.VAULT_SECRET_ID;

/**
 * Load all secrets from Vault and merge into process.env.
 * Call this once at startup before anything else reads process.env.
 */
async function loadSecrets() {
  // If VAULT_ADDR is not set, assume local dev — use .env as-is
  if (!VAULT_ADDR) {
    console.log('[Vault] VAULT_ADDR not set — using local .env values');
    return;
  }

  try {
    const client = vault({ endpoint: VAULT_ADDR });

    // Authenticate with AppRole
    const auth = await client.approleLogin({
      role_id: VAULT_ROLE_ID,
      secret_id: VAULT_SECRET_ID
    });
    client.token = auth.auth.client_token;

    // Fetch all secret paths
    const paths = [
      'secret/data/3dstore/app',
      'secret/data/3dstore/database',
      'secret/data/3dstore/razorpay',
      'secret/data/3dstore/email',
      'secret/data/3dstore/oauth',
      'secret/data/3dstore/storage'
    ];

    for (const path of paths) {
      const result = await client.read(path);
      const secrets = result.data.data; // KV v2 nests under data.data
      Object.assign(process.env, secrets);
    }

    console.log('[Vault] Secrets loaded successfully');
  } catch (err) {
    console.error('[Vault] Failed to load secrets:', err.message);
    // In production you likely want to exit here rather than run with missing secrets
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

module.exports = { loadSecrets };
```

Update `backend/src/index.js` to call `loadSecrets()` before anything else:

```js
// At the very top of index.js, before other requires
const { loadSecrets } = require('./config/vault');

async function startServer() {
  await loadSecrets(); // Fetch secrets from Vault first

  // ... rest of your existing server setup
  const express = require('express');
  // etc.
}

startServer();
```

---

## Part 5: Local Development Workflow

You don't need Vault running locally. Just keep using `.env` as normal:

```env
# backend/.env (local dev — no VAULT_ADDR set)
JWT_SECRET=dev_secret_only
DB_PASSWORD=postgres
# etc.
```

When `VAULT_ADDR` is absent, `vault.js` skips Vault and uses `.env` directly.

---

## Cloud Migration Path

When you're ready to move off self-hosted:

### Option A — HCP Vault (HashiCorp Cloud)
1. Create a cluster at https://portal.cloud.hashicorp.com
2. Change `VAULT_ADDR` in your production env to the HCP cluster URL
3. Re-run the AppRole setup against the new cluster
4. **Zero app code changes**

### Option B — AWS Secrets Manager
1. Install `@aws-sdk/client-secrets-manager` instead of `node-vault`
2. Replace the `loadSecrets()` implementation to call `GetSecretValue`
3. Use IAM roles instead of AppRole for authentication
4. The rest of the app is unchanged since secrets still land in `process.env`

---

## Security Checklist

- [ ] Never commit `.env` to git (already in `.gitignore` ✓)
- [ ] Never commit `VAULT_SECRET_ID` to git — treat it like a password
- [ ] Enable TLS on Vault in production (`tls_cert_file` / `tls_key_file` in config)
- [ ] Use a dedicated low-privilege policy (not root token) for the app
- [ ] Rotate `secret_id` periodically or set `secret_id_ttl`
- [ ] Back up Vault's storage directory (`/vault/data`)
- [ ] Store unseal keys in a password manager or split across trusted people
- [ ] Enable Vault audit logging: `vault audit enable file file_path=/vault/logs/audit.log`
