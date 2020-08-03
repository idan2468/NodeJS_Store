const {check} = require('express-validator');
const express = require('express');
const isAuth = require('../middleware/is-auth')
const adminController = require('../controllers/admin');
const router = express.Router();

// Validations //

const productFieldsValidation = [check('title', 'Invalid Title').trim().notEmpty(),
    check('description', 'No description').notEmpty(),
    check('price', "Price must be numeric").isNumeric().toFloat()]


// Routes //

// /admin/add-product => GET
router.get('/add-product', isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get('/products', isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post('/add-product', isAuth, productFieldsValidation, adminController.postAddProduct);

// /admin/edit-product/:productId => GET
router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

// /admin/edit-product => POST
router.post('/edit-product', isAuth, productFieldsValidation, adminController.postEditProduct);

// /admin/product => DELETE
router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;
