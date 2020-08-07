const mongoose = require('mongoose');
const Order = new require('./order');
const Product = new require('./product');

const NOT_FOUND = -1;

const userSchema = new mongoose.Schema({
    name: {
        type: String
    },
    email: {
        type: String,
        unique: true
    },
    password: {
        type: String
    },
    resetToken: String,
    resetTokenExp: Date,
    cart: {
        products: [{
            productId: {type: mongoose.Schema.Types.ObjectId, ref: 'Product'},
            quantity: {type: Number},
            _id: false
        }],
        totalPrice: {type: Number, default: 0}
    }
})

/**
 * Add product to the user cart
 * @param prodId    The product ID to add
 */
userSchema.methods.addToCart = async function (prodId) {
    const prodIndex = this.cart.products.findIndex(prod => prod.productId.toString() === prodId.toString());
    if (prodIndex !== NOT_FOUND) {
        this.cart.products[prodIndex].quantity++;
    } else {
        this.cart.products.push({
            productId: prodId,
            quantity: 1
        });
    }
    const product = await Product.findById(prodId);
    this.cart.totalPrice += product.price;
    return this.save();
}

/**
 * @returns The user cart populated with the products information from the product collection
 */
userSchema.methods.getCart = function () {
    return this.populate("cart.products.productId").execPopulate().then(res => res.cart);
}

/**
 * Remove product from the cart
 * @param prodId    The product ID to remove
 */
userSchema.methods.removeFromCart = async function (prodId) {
    this.cart.products = this.cart.products.filter(prod => prod.productId.toString() !== prodId.toString());
    const productToRemove = await Product.findById(prodId);
    this.cart.totalPrice -= productToRemove.price;
    this.save();
}

/**
 * Add order to the user, from the current user's cart.
 * after creation of the order empty the cart
 */
userSchema.methods.addOrder = async function () {
    this.cart.totalPrice = getTotalPrice(await this.getCart());
    const order = await new Order({userId: this._id, cart: this.cart})
    this.cart.products = [];
    this.cart.totalPrice = 0;
    this.save();
    order.save().catch(error => console.log(error));
}

/**
 * @returns All the orders of the user
 */
userSchema.methods.getAllOrders = async function () {
    return Order.find({userId: this._id}).populate("cart.products.productId").exec();
}

function getTotalPrice(cart) {
    let totalPrice = 0;
    for (const product of cart.products) {
        totalPrice += product.productId.price * product.quantity;
    }
    return totalPrice;
}
module.exports = new mongoose.model("User", userSchema);
