const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    cart: {
        products: [{
            productId: {type: mongoose.Schema.Types.ObjectId, ref: 'Product'},
            quantity: {type: Number},
            _id: false
        }],
        totalPrice: {type: Number, default: 0}
    }
});


module.exports = new mongoose.model('Order', orderSchema);