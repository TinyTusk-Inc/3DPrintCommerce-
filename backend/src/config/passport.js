/**
 * Passport.js Configuration
 * Sets up Google and Facebook OAuth 2.0 strategies
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { User } = require('../models');

// Serialize user to session (not used in JWT flow, but required by Passport)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ---------------------------------------------------------------------------
// Google OAuth 2.0 Strategy
// ---------------------------------------------------------------------------

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value || null;
          const name = profile.displayName || 'Google User';
          const avatarUrl = profile.photos?.[0]?.value || null;

          // Try to find user by google_id first
          let user = await User.findByGoogleId(googleId);

          if (user) {
            // User already linked — return existing user
            return done(null, user);
          }

          // No google_id match — check if email exists (account linking)
          if (email) {
            user = await User.findByEmail(email);
            if (user) {
              // Link Google to existing account
              await User.linkGoogle(user.id, googleId, avatarUrl);
              user = await User.findById(user.id); // Refresh
              return done(null, user);
            }
          }

          // No existing account — create new user
          user = await User.createSocialUser({
            google_id: googleId,
            email,
            name,
            avatar_url: avatarUrl
          });

          return done(null, user);
        } catch (err) {
          console.error('[Passport Google] Error:', err);
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('[Passport] Google OAuth not configured — GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing');
}

// ---------------------------------------------------------------------------
// Facebook OAuth 2.0 Strategy
// ---------------------------------------------------------------------------

if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback',
        profileFields: ['id', 'displayName', 'emails', 'photos']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const facebookId = profile.id;
          const email = profile.emails?.[0]?.value || null;
          const name = profile.displayName || 'Facebook User';
          const avatarUrl = profile.photos?.[0]?.value || null;

          // Try to find user by facebook_id first
          let user = await User.findByFacebookId(facebookId);

          if (user) {
            // User already linked — return existing user
            return done(null, user);
          }

          // No facebook_id match — check if email exists (account linking)
          if (email) {
            user = await User.findByEmail(email);
            if (user) {
              // Link Facebook to existing account
              await User.linkFacebook(user.id, facebookId, avatarUrl);
              user = await User.findById(user.id); // Refresh
              return done(null, user);
            }
          }

          // No existing account — create new user
          user = await User.createSocialUser({
            facebook_id: facebookId,
            email,
            name,
            avatar_url: avatarUrl
          });

          return done(null, user);
        } catch (err) {
          console.error('[Passport Facebook] Error:', err);
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('[Passport] Facebook OAuth not configured — FACEBOOK_APP_ID or FACEBOOK_APP_SECRET missing');
}

module.exports = passport;
