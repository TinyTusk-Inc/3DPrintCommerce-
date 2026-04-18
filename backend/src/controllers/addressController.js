/**
 * Address Controller
 * CRUD for user saved addresses.
 * All routes require authentication — users can only manage their own addresses.
 */

const UserAddress = require('../models/UserAddress');

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

async function listAddresses(req, res) {
  try {
    const userId = req.user.userId;
    const addresses = await UserAddress.listByUser(userId);
    return res.status(200).json({ addresses });
  } catch (err) {
    console.error('listAddresses error:', err);
    return res.status(500).json({ error: 'Failed to retrieve addresses' });
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

async function createAddress(req, res) {
  try {
    const userId = req.user.userId;
    const { label, name, phone, use_account_phone, street, city, state, pincode, country, is_default } = req.body;

    if (!name || !street || !city || !state || !pincode) {
      return res.status(400).json({
        error: 'Required fields: name, street, city, state, pincode'
      });
    }

    // Length limits
    if (name.length > 255) return res.status(400).json({ error: 'Name must be 255 characters or less' });
    if (street.length > 500) return res.status(400).json({ error: 'Street must be 500 characters or less' });
    if (city.length > 100) return res.status(400).json({ error: 'City must be 100 characters or less' });
    if (state.length > 100) return res.status(400).json({ error: 'State must be 100 characters or less' });

    // Validate Indian pincode format (6 digits)
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(422).json({ error: 'Pincode must be a 6-digit number' });
    }

    // If not using account phone, a phone number is required
    if (!use_account_phone && !phone) {
      return res.status(400).json({ error: 'Phone number is required when not using account phone' });
    }

    const address = await UserAddress.create(userId, {
      label, name, phone, use_account_phone,
      street, city, state, pincode, country, is_default
    });

    return res.status(201).json({ address });
  } catch (err) {
    console.error('createAddress error:', err);
    return res.status(500).json({ error: 'Failed to create address' });
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

async function updateAddress(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const existing = await UserAddress.findById(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const { label, name, phone, use_account_phone, street, city, state, pincode, country, is_default } = req.body;

    if (pincode && !/^\d{6}$/.test(pincode)) {
      return res.status(422).json({ error: 'Pincode must be a 6-digit number' });
    }

    const updated = await UserAddress.update(id, userId, {
      label, name, phone, use_account_phone,
      street, city, state, pincode, country, is_default
    });

    return res.status(200).json({ address: updated });
  } catch (err) {
    console.error('updateAddress error:', err);
    return res.status(500).json({ error: 'Failed to update address' });
  }
}

// ---------------------------------------------------------------------------
// Set default
// ---------------------------------------------------------------------------

async function setDefaultAddress(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const address = await UserAddress.setDefault(id, userId);
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    return res.status(200).json({ address, message: 'Default address updated' });
  } catch (err) {
    console.error('setDefaultAddress error:', err);
    return res.status(500).json({ error: 'Failed to set default address' });
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

async function deleteAddress(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const success = await UserAddress.delete(id, userId);
    if (!success) {
      return res.status(404).json({ error: 'Address not found' });
    }

    return res.status(200).json({ message: 'Address deleted' });
  } catch (err) {
    console.error('deleteAddress error:', err);
    return res.status(500).json({ error: 'Failed to delete address' });
  }
}

module.exports = { listAddresses, createAddress, updateAddress, setDefaultAddress, deleteAddress };
