const express = require('express');
const {check} = require('express-validator');
const User = new require('../models/user')
const authController = require('../controllers/auth');
const isAuth = require('../middleware/is-auth')
const router = express.Router();

// Validations //

async function isNewEmail(email) {
    const user = await User.findOne({email: email});
    if (user) {
        throw Error("Email already exists");
    }
    return true;
}


const signUpValidation = [check('email', 'Invalid email').isEmail().custom(isNewEmail).trim(),
    check('username', 'Invalid username').isAlphanumeric().trim(),
    check('password', 'Password must be 6-12 length').isLength({min: 6, max: 12}),
    check('confirmPassword', "Confirm password doesn't match password").custom(
        (value, {req}) => req.body.password === value).trim()]

const emailValidation = [check('email', 'Invalid email').isEmail().trim(),
    check('password', 'Password must be 6-12 length').isLength({min: 6, max: 12})]


// Routes //

// /login => GET
router.get('/login', authController.getLogin);

// /signup => GET
router.get('/signup', authController.getSignup);

// /login => POST
router.post('/login', emailValidation, authController.postLogin);

// /signup => POST
router.post('/signup', signUpValidation, authController.postSignup);

// /reset-password => GET
router.get('/reset-password', authController.getResetPassword);

// /reset-password => POST
router.post('/reset-password', authController.postResetPassword);

// /reset/:token => GET
router.get('/reset/:token', authController.getNewPassword);

// /new-password => POST
router.post('/new-password', authController.postNewPassword);

// /logout => POST
router.post('/logout', isAuth, authController.postLogout);


module.exports = router;
