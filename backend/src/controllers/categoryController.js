/**
 * Category Controller
 * Handles product category management
 */

const { Category, Product } = require('../models');

/**
 * Get all categories
 * GET /api/categories
 * 
 * @param {object} req - Express request
 * @returns {object} { categories: [...] }
 */
async function listCategories(req, res) {
  try {
    const categories = await Category.listAll();

    // Optionally add product count to each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await Category.countProducts(category.id);
        return {
          ...category,
          product_count: count
        };
      })
    );

    return res.status(200).json({
      categories: categoriesWithCounts
    });
  } catch (error) {
    console.error('List categories error:', error);
    return res.status(500).json({
      error: 'Failed to list categories',
      message: error.message
    });
  }
}

/**
 * Get single category by ID
 * GET /api/categories/:id
 * 
 * @param {object} req - Express request
 * @param {string} req.params.id - Category UUID
 * @returns {object} { category: {...}, product_count: 10 }
 */
async function getCategory(req, res) {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        error: 'Category not found'
      });
    }

    const productCount = await Category.countProducts(id);

    return res.status(200).json({
      category,
      product_count: productCount
    });
  } catch (error) {
    console.error('Get category error:', error);
    return res.status(500).json({
      error: 'Failed to get category',
      message: error.message
    });
  }
}

/**
 * Create new category (admin only)
 * POST /api/categories
 * 
 * @param {object} req - Express request
 * @param {string} req.body.name
 * @param {string} req.body.description - optional
 * @returns {object} { category: {...} }
 */
async function createCategory(req, res) {
  try {
    const { name, description } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        error: 'Name is required'
      });
    }

    // Check if category with same name exists
    const existing = await Category.findByName(name);
    if (existing) {
      return res.status(409).json({
        error: 'Category with this name already exists'
      });
    }

    const category = await Category.create(name, description || null);

    return res.status(201).json({
      category
    });
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json({
      error: 'Failed to create category',
      message: error.message
    });
  }
}

/**
 * Update category (admin only)
 * PUT /api/categories/:id
 * 
 * @param {object} req - Express request
 * @param {string} req.params.id - Category UUID
 * @param {string} req.body.name - optional
 * @param {string} req.body.description - optional
 * @returns {object} { category: {...} }
 */
async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Check category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        error: 'Category not found'
      });
    }

    // If name is being changed, check for duplicates
    if (name && name !== category.name) {
      const existing = await Category.findByName(name);
      if (existing) {
        return res.status(409).json({
          error: 'Category with this name already exists'
        });
      }
    }

    const updated = await Category.update(id, { name, description });

    return res.status(200).json({
      category: updated
    });
  } catch (error) {
    console.error('Update category error:', error);
    return res.status(500).json({
      error: 'Failed to update category',
      message: error.message
    });
  }
}

/**
 * Delete category (admin only)
 * DELETE /api/categories/:id
 * 
 * Note: Will cascade delete all products in this category
 * 
 * @param {object} req - Express request
 * @param {string} req.params.id - Category UUID
 * @returns {object} { message: "Category deleted successfully" }
 */
async function deleteCategory(req, res) {
  try {
    const { id } = req.params;

    // Check category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        error: 'Category not found'
      });
    }

    // Check if category has products
    const productCount = await Category.countProducts(id);
    if (productCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete category with products',
        product_count: productCount,
        message: 'Please delete or reassign products first'
      });
    }

    const success = await Category.delete(id);
    if (!success) {
      throw new Error('Failed to delete category');
    }

    return res.status(200).json({
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return res.status(500).json({
      error: 'Failed to delete category',
      message: error.message
    });
  }
}

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
};
