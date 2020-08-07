const Product = new require('../models/product');
const pdfCreator = require('pdfkit')
const path = require('path');
const fs = require('fs');
const Order = new require('../models/order');

const STRIPE_API_KEY = process.env.STRIPE_KEY;
const NUM_OF_PRODS_PER_PAGE = 2;
const SEPARATOR = '------------------------------------------------------------------------';

const stripe = require('stripe')(STRIPE_API_KEY);

/**
 * Handler to /products => GET
 * Render HTML: shop/product-list.ejs
 */
exports.getProducts = async (req, res, next) => {
    let page = req.query.page ? +req.query.page : 1;
    const numOfProducts = await Product.countDocuments({});
    Product.find({})
        .skip((page - 1) * NUM_OF_PRODS_PER_PAGE)
        .limit(NUM_OF_PRODS_PER_PAGE)
        .then(products => {
            res.render('shop/product-list', {
                prods: products,
                pageTitle: 'All Products',
                path: '/products',
                currPage: page,
                totalNumOfProducts: numOfProducts,
                numOfProductsPerPage: NUM_OF_PRODS_PER_PAGE
            });
        })
};

/**
 * Handler to /products/:productId => GET
 * Render HTML: shop/product-detail.ejs
 */
exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            res.render('shop/product-detail', {
                product: product,
                pageTitle: product.title,
                path: '/products'
            });
        })
        .catch(err => next(new Error(err)));
};

/**
 * Handler to / => GET
 * Render HTML: shop/index.ejs
 */
exports.getIndex = async (req, res, next) => {
    let page = req.query.page ? +req.query.page : 1;
    const numOfProducts = await Product.countDocuments({});
    Product.find({})
        .skip((page - 1) * NUM_OF_PRODS_PER_PAGE)
        .limit(NUM_OF_PRODS_PER_PAGE)
        .then(products => {
            res.render('shop/index', {
                prods: products,
                pageTitle: 'Shop',
                path: '/',
                currPage: page,
                totalNumOfProducts: numOfProducts,
                numOfProductsPerPage: NUM_OF_PRODS_PER_PAGE
            });
        }).catch(err => next(new Error(err)));
};

/**
 * Handler to /cart => GET
 * Render HTML: shop/cart.ejs
 */
exports.getCart = async (req, res, next) => {
    req.user.getCart().then(cart => {
        res.render('shop/cart', {
            path: '/cart',
            pageTitle: 'Your Cart',
            cart: cart
        });
    });
};

/**
 * Handler to /cart => POST
 */
exports.postCart = async (req, res, next) => {
    const prodId = req.body.productId;
    req.user.addToCart(prodId).then(() => res.redirect('/cart')).catch(err => next(new Error(err)));
};

/**
 * Handler to /cart-delete-item => POST
 */
exports.postCartDeleteProduct = async (req, res, next) => {
    const prodId = req.body.productId;
    try {
        await req.user.removeFromCart(prodId);
        res.redirect('/cart');
    } catch (error) {
        return next(new Error(error))
    }
};


/**
 * Handler to /orders => GET
 * Render HTML: shop/orders.ejs
 */
exports.getOrders = (req, res, next) => {
    req.user.getAllOrders()
        .then(orders => {
            const myOrders = orders.map(order => {
                const newOrder = {products: [], _id: order._id};
                newOrder.products = order.cart.products.map(prod => {
                    return {...prod.productId._doc, quantity: prod.quantity}
                })
                return newOrder;
            });
            res.render('shop/orders', {
                path: '/orders',
                pageTitle: 'Your Orders',
                orders: myOrders
            });
        })
        .catch(err => next(new Error(err)));
};

/**
 * Download invoice handler
 * Handler to /orders/:orderId => GET
 */
exports.getInvoice = async (req, res, next) => {
    const invoiceId = req.params['orderId'];
    if (!await isAuthorizedDownloadInvoice(invoiceId, req.user._id)) {
        return next(new Error("Unauthorized access!!"));
    }
    res.header('Content-Disposition', `inline; filename=${invoiceId}.pdf`)
    res.header('Content-Type', 'application/pdf');
    const filePath = path.join('data', 'invoices', `invoice - ${invoiceId}.pdf`);
    const pdfDoc = new pdfCreator();
    pdfDoc.pipe(fs.createWriteStream(filePath));
    pdfDoc.pipe(res);
    createPDF(pdfDoc, invoiceId);
};

/**
 * Check if the invoice given if of the user given
 * @param invoiceId Invoice ID
 * @param userId User ID
 * @returns Order object if there is a much else nan
 */
const isAuthorizedDownloadInvoice = async (invoiceId, userId) => {
    return Order.findOne({_id: invoiceId, userId: userId});
};

/**
 * Create the Invoice PDF
 * @param pdfDoc    The pdfDoc object
 * @param invoiceId The invoice ID
 */
async function createPDF(pdfDoc, invoiceId) {
    pdfDoc.fontSize(26).text("Your Invoice");
    pdfDoc.fontSize(15).text(SEPARATOR);
    pdfDoc.fontSize(15).text(SEPARATOR);
    const order = await Order.findById(invoiceId).populate('cart.products.productId');
    order.cart.products.forEach(prod => {
        pdfDoc.fontSize(15).text(`${prod.quantity} X ${prod.productId.title}      $${prod.productId.price * prod.quantity}`);
    });
    pdfDoc.fontSize(15).text(SEPARATOR);
    pdfDoc.fontSize(15).text(SEPARATOR);
    pdfDoc.text(`\n\nTotal: $${order.cart.totalPrice}`);
    pdfDoc.end();
}

/**
 * Handler to /checkout => GET
 * Render HTML: shop/checkout.ejs
 */
exports.getCheckout = async (req, res, next) => {
    let cart = await req.user.getCart()
    stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: cart.products.map(prod => {
            return {
                name: prod.productId.title,
                description: prod.productId.description,
                amount: prod.productId.price * 100,
                currency: 'usd',
                quantity: prod.quantity
            }
        }),
        success_url: req.protocol + "://" + req.get('host') + '/checkout/success', // => http://localhost:3000
        cancel_url: req.protocol + "://" + req.get('host') + '/checkout/cancel'
    })
        .then(session => {
            let totalPrice = getTotalPrice(cart);
            res.render('shop/checkout', {
                path: '/checkout',
                pageTitle: 'Checkout',
                cart: {...cart, totalPrice: totalPrice},
                sessionId: session.id
            })
        })
        .catch(err => next(new Error(err)));
};

/**
 * Handler to /checkout-success => GET
 */
exports.getCheckoutSuccess = async (req, res, next) => {
    try {
        await req.user.addOrder();
        res.redirect('/orders');
    } catch (error) {
        return next(new Error(error));
    }
};

function getTotalPrice(cart) {
    let totalPrice = 0;
    for (const product of cart.products) {
        totalPrice += product.productId.price * product.quantity;
    }
    return totalPrice;
}