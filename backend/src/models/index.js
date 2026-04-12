/**
 * Database Models Index
 * 
 * All database models for the 3D Print Commerce application
 * Import this module and destructure needed models in controllers and routes
 * 
 * Example:
 *   const { User, Product, Order } = require('../models');
 *   // or
 *   const User = require('../models').User;
 */

module.exports = {
  User: require('./User'),
  Category: require('./Category'),
  Product: require('./Product'),
  Order: require('./Order'),
  OrderItem: require('./OrderItem'),
  Review: require('./Review'),
  InventoryLog: require('./InventoryLog'),
  CustomOrder: require('./CustomOrder'),
  CustomOrderFile: require('./CustomOrderFile'),
};
