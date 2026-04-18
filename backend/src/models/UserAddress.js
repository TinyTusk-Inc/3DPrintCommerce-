/**
 * UserAddress Model
 * Manages multiple saved addresses per user.
 */

const { query } = require('../config/database');

class UserAddress {
  /**
   * List all addresses for a user (default first)
   */
  static async listByUser(userId) {
    const text = `
      SELECT id, user_id, label, name, phone, use_account_phone,
             street, city, state, pincode, country, is_default,
             created_at, updated_at
      FROM user_addresses
      WHERE user_id = $1
      ORDER BY is_default DESC, created_at ASC
    `;
    const res = await query(text, [userId]);
    return res.rows;
  }

  /**
   * Get a single address by ID (verifies ownership)
   */
  static async findById(addressId, userId = null) {
    const text = `
      SELECT id, user_id, label, name, phone, use_account_phone,
             street, city, state, pincode, country, is_default,
             created_at, updated_at
      FROM user_addresses
      WHERE id = $1 ${userId ? 'AND user_id = $2' : ''}
    `;
    const params = userId ? [addressId, userId] : [addressId];
    const res = await query(text, params);
    return res.rows[0] || null;
  }

  /**
   * Get the default address for a user
   */
  static async getDefault(userId) {
    const text = `
      SELECT id, user_id, label, name, phone, use_account_phone,
             street, city, state, pincode, country, is_default,
             created_at, updated_at
      FROM user_addresses
      WHERE user_id = $1 AND is_default = TRUE
      LIMIT 1
    `;
    const res = await query(text, [userId]);
    return res.rows[0] || null;
  }

  /**
   * Create a new address.
   * If is_default=true or this is the user's first address, clears other defaults first.
   */
  static async create(userId, data) {
    const {
      label = 'Home',
      name,
      phone = null,
      use_account_phone = true,
      street,
      city,
      state,
      pincode,
      country = 'India',
      is_default = false
    } = data;

    // Check if this is the first address — auto-default
    const existing = await UserAddress.listByUser(userId);
    const shouldBeDefault = is_default || existing.length === 0;

    if (shouldBeDefault) {
      await query(
        'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
        [userId]
      );
    }

    const text = `
      INSERT INTO user_addresses
        (user_id, label, name, phone, use_account_phone, street, city, state, pincode, country, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      userId, label, name, phone, use_account_phone,
      street, city, state, pincode, country, shouldBeDefault
    ];
    const res = await query(text, values);
    return res.rows[0];
  }

  /**
   * Update an existing address (user must own it)
   */
  static async update(addressId, userId, data) {
    const {
      label, name, phone, use_account_phone,
      street, city, state, pincode, country, is_default
    } = data;

    if (is_default) {
      await query(
        'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1 AND id != $2',
        [userId, addressId]
      );
    }

    const text = `
      UPDATE user_addresses
      SET label             = COALESCE($3, label),
          name              = COALESCE($4, name),
          phone             = $5,
          use_account_phone = COALESCE($6, use_account_phone),
          street            = COALESCE($7, street),
          city              = COALESCE($8, city),
          state             = COALESCE($9, state),
          pincode           = COALESCE($10, pincode),
          country           = COALESCE($11, country),
          is_default        = COALESCE($12, is_default),
          updated_at        = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const values = [
      addressId, userId,
      label, name, phone ?? null, use_account_phone,
      street, city, state, pincode, country, is_default
    ];
    const res = await query(text, values);
    return res.rows[0] || null;
  }

  /**
   * Set an address as default (clears others)
   */
  static async setDefault(addressId, userId) {
    await query(
      'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
      [userId]
    );
    const text = `
      UPDATE user_addresses
      SET is_default = TRUE, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const res = await query(text, [addressId, userId]);
    return res.rows[0] || null;
  }

  /**
   * Delete an address. If it was the default, promote the next oldest.
   */
  static async delete(addressId, userId) {
    const addr = await UserAddress.findById(addressId, userId);
    if (!addr) return false;

    await query('DELETE FROM user_addresses WHERE id = $1 AND user_id = $2', [addressId, userId]);

    // If deleted address was default, promote the next one
    if (addr.is_default) {
      await query(`
        UPDATE user_addresses
        SET is_default = TRUE
        WHERE user_id = $1
        ORDER BY created_at ASC
        LIMIT 1
      `, [userId]);
    }

    return true;
  }
}

module.exports = UserAddress;
