/**
 * Review Routes
 * GET  /api/reviews?product_id=:id  — list reviews for a product
 * POST /api/reviews                 — create a review (auth required)
 * PUT  /api/reviews/:id             — update own review (auth required)
 * DELETE /api/reviews/:id           — delete own review (auth required)
 */

const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { verifyToken, optionalAuth } = require('../middleware/authMiddleware');

/**
 * GET /api/reviews?product_id=:id
 * List reviews for a product. Auth optional (shows whether current user reviewed).
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { product_id, page = 1, limit = 20 } = req.query;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id query parameter is required' });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const [reviews, stats] = await Promise.all([
      Review.listByProduct(product_id, limitNum, offset),
      Review.getStats(product_id)
    ]);

    // Flag which review belongs to the current user (if authenticated)
    const userId = req.user?.userId;
    const enriched = reviews.map((r) => ({
      ...r,
      is_own: userId ? r.user_id === userId : false
    }));

    return res.status(200).json({ reviews: enriched, stats });
  } catch (err) {
    console.error('Error listing reviews:', err);
    return res.status(500).json({ error: 'Failed to retrieve reviews' });
  }
});

/**
 * POST /api/reviews
 * Create a review. One review per user per product.
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { product_id, rating, text } = req.body;
    const user_id = req.user.userId;

    if (!product_id || !rating) {
      return res.status(400).json({ error: 'product_id and rating are required' });
    }

    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(422).json({ error: 'rating must be an integer between 1 and 5' });
    }

    // Prevent duplicate reviews
    const existing = await Review.findUserReview(product_id, user_id);
    if (existing) {
      return res.status(409).json({
        error: 'You have already reviewed this product',
        review_id: existing.id
      });
    }

    const review = await Review.create({ product_id, user_id, rating: ratingNum, text: text || null });
    return res.status(201).json({ review });
  } catch (err) {
    console.error('Error creating review:', err);
    return res.status(500).json({ error: 'Failed to create review' });
  }
});

/**
 * PUT /api/reviews/:id
 * Update own review.
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, text } = req.body;
    const user_id = req.user.userId;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.user_id !== user_id) {
      return res.status(403).json({ error: 'You can only edit your own reviews' });
    }

    if (rating !== undefined) {
      const ratingNum = parseInt(rating, 10);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(422).json({ error: 'rating must be an integer between 1 and 5' });
      }
    }

    const updated = await Review.update(id, { rating, text });
    return res.status(200).json({ review: updated });
  } catch (err) {
    console.error('Error updating review:', err);
    return res.status(500).json({ error: 'Failed to update review' });
  }
});

/**
 * DELETE /api/reviews/:id
 * Delete own review (admin can delete any).
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.userId;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Allow admin or review owner
    const { User } = require('../models');
    const user = await User.findById(user_id);
    if (review.user_id !== user_id && !user?.is_admin) {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }

    await Review.delete(id);
    return res.status(200).json({ message: 'Review deleted' });
  } catch (err) {
    console.error('Error deleting review:', err);
    return res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;
