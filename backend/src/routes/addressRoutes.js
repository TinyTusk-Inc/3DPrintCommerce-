/**
 * Address Routes
 * All routes require authentication.
 *
 * GET    /api/addresses          — list user's saved addresses
 * POST   /api/addresses          — create new address
 * PUT    /api/addresses/:id      — update address
 * PATCH  /api/addresses/:id/default — set as default
 * DELETE /api/addresses/:id      — delete address
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const addressController = require('../controllers/addressController');

router.use(verifyToken);

router.get('/',              addressController.listAddresses);
router.post('/',             addressController.createAddress);
router.put('/:id',           addressController.updateAddress);
router.patch('/:id/default', addressController.setDefaultAddress);
router.delete('/:id',        addressController.deleteAddress);

module.exports = router;
