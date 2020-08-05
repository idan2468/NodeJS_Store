const {validationResult} = require("express-validator");
const Product = new require("../models/product");
const path = require('path');
const User = new require('../models/user');
const Order = new require('../models/order');
const errorHandlers = require('../util/errorHandlers');
const fs = require('fs');

const ADD_PRODUCT_FIELDS = ["title", 'price', 'description'];
const EDIT_PRODUCT_FIELDS = [...ADD_PRODUCT_FIELDS, "imageUrl"];
const INVALID_IMAGE_MSG = "Invalid Image.";

/**
 * Handler to /admin/add-product => GET
 * Render HTML: admin/edit-product
 */
exports.getAddProduct = (req, res, next) => {
    res.render("admin/edit-product", {
        pageTitle: "Add Product",
        path: "/admin/add-product",
        editing: false,
        product: {},
        errorFields: {}
    });
};

/**
 * Handler to /admin/add-product => POST
 * Render HTML: admin/edit-product
 */
exports.postAddProduct = async (req, res, next) => {
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;
    const userId = req.user._id;
    const errors = validationResult(req);

    if (!errors.isEmpty() || !image) {
        const oldValues = errorHandlers.getOldValuesByFields(ADD_PRODUCT_FIELDS, req)
        const errorFields = errorHandlers.getErrorFields(errors);
        return res.status(422).render("admin/edit-product", {
            pageTitle: "Add Product",
            path: "/admin/add-product",
            editing: false,
            errorMessage: !errors.isEmpty() ? errors.array({onlyFirstError: true})[0].msg : INVALID_IMAGE_MSG,
            product: oldValues,
            errorFields: errorFields
        });
    }

    let newProduct = new Product({
        title: title,
        userId: userId,
        price: price,
        description: description,
        imageUrl: image.path.replace('\\', '/')
    });
    newProduct.save().then(() => res.redirect("/admin/products"))
        .catch(err => next(new Error(err)));
};

/**
 * Handler to /admin/edit-product/:productId => GET
 * Render HTML admin/edit-product
 */
exports.getEditProduct = async (req, res, next) => {
    if (!await isAuthorized(req.params.productId, req.user._id)) {
        return next(new Error("Unauthorized access!!"));
    }
    try {
        const editMode = req.query["edit"];
        if (!editMode) {
            return next(new Error("Unauthorized access!!"));
        }
        const prodId = req.params["productId"];
        const product = await Product.findById(prodId);
        res.render("admin/edit-product", {
            pageTitle: "Edit Product",
            path: "/admin/edit-product",
            editing: editMode,
            product: product,
            errorFields: {}
        });
    } catch (e) {
        return next(new Error(e));
    }

};

/**
 * Handler to /admin/edit-product => POST
 * Render HTML admin/edit-product
 */
exports.postEditProduct = async (req, res, next) => {
    if (!await isAuthorized(req.body.productId, req.user._id)) {
        return next(new Error("Unauthorized access!!"));
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const oldValues = errorHandlers.getOldValuesByFields(EDIT_PRODUCT_FIELDS, req);
        oldValues._id = req.body.productId;
        const errorFields = errorHandlers.getErrorFields(errors);
        return res.status(422).render("admin/edit-product", {
            pageTitle: "Edit Product",
            path: "/admin/edit-product",
            editing: true,
            errorMessage: errors.array({onlyFirstError: true})[0].msg,
            product: oldValues,
            errorFields: errorFields
        });
    }
    let filePath = await Product.findById(req.body.productId);
    if (req.file) {
        filePath = path.join(__dirname, '..', filePath.imageUrl);
        fs.unlink(filePath, err => err ? console.log(err) : null);
        filePath = req.file.path
    } else {
        filePath = filePath.imageUrl;
    }
    Product.findByIdAndUpdate(req.body.productId, {
        title: req.body.title,
        price: req.body.price,
        description: req.body.description,
        imageUrl: filePath.replace('\\', '/')
    })
        .then(() => {
            res.redirect("/admin/products");
        })
        .catch(err => next(new Error(err)));
};

/**
 * Handler to /admin/products => GET
 * Render HTML admin/products
 */
exports.getProducts = (req, res, next) => {
    Product.find({userId: req.user._id})
        .then(products => {
            res.render("admin/products", {
                prods: products,
                pageTitle: "Admin Products",
                path: "/admin/products"
            });
        })
        .catch(err => next(new Error(err)));
};

/**
 * Handler to /admin/product => DELETE
 */
exports.deleteProduct = async (req, res, next) => {
    const prodId = req.params.productId;
    if (!await isAuthorized(prodId, req.user._id)) {
        return next(new Error("Unauthorized access!!"));
    }
    try {
        const productToDelete = await Product.findById(prodId);
        removeRef(productToDelete);
        const filePath = path.join(__dirname, '..', productToDelete.imageUrl);
        fs.unlink(filePath, err => err ? console.log(err) : null);
        await Product.findByIdAndDelete(prodId);
        res.status(200).json({message: "Success"});
    } catch (e) {
        res.status(500).json({message: "Failed"});
    }
};

/**
 * Check if the user authorized to delete/modify the product
 * @param prodId    Product ID
 * @param userId    User ID
 * @returns The product object if it was found and nan otherwise
 */
const isAuthorized = async (prodId, userId) => {
    return Product.findOne({_id: prodId, userId: userId});
};

/**
 * Remove product ref from orders and users collections
 * @param product   The product object that has to be deleted
 */
const removeRef = async product => {
    Order.find({'cart.products.productId': product._id}, (err, orders) => removeRelatedElements(err, orders, product));
    User.find({'cart.products.productId': product._id}, (err, users) => removeRelatedElements(err, users, product));
};

/**
 * Helper to the removeRef that remove the ref of specified product from the given documents
 * @param err   Error in case of some error getting the data
 * @param elements  The documents to delete the reg from
 * @param productToDelete   The product object that has to be deleted
 */
const removeRelatedElements = (err, elements, productToDelete) => {
    if (!err) {
        elements.forEach(element => {
            const productToRemove = element.cart.products.find(prod => prod.productId.toString() ===
                productToDelete._id.toString());
            element.cart.products = element.cart.products.filter(prod => prod.productId.toString() !==
                productToDelete._id.toString());
            element.cart.totalPrice -= productToRemove.quantity * productToDelete.price;
            element.save();
        });
    }
};
