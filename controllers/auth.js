const User = new require('../models/user');
const crypto = require('crypto');
const nodeMailer = require('nodemailer');
const {validationResult} = require('express-validator');
const sendGridTransport = require('nodemailer-sendgrid-transport');
const errorHandlers = require('../util/errorHandlers');
const bcrypt = new require('bcryptjs');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const REGISTER_EMAIL_SUBJECT = "Register Succeeded";
const HASH_LEN = 12;
const ONE_HOUR_IN_MILLI = 60 * 60 * 1000;
const LOGIN_ERROR_MSG = 'Wrong email or password';
const INVALID_EMAIL_ERROR_MSG = "Email doesn't exists";
const SIGNUP_FIELDS = ["username", "password", "email", "confirmPassword"];
const SEND_GRID_API_KEY = process.env.SEND_GRID_API_KEY;
const RESET_PASS_TOKEN_SIZE = 32;

const transporter = nodeMailer.createTransport(sendGridTransport({
    auth: {
        api_key: SEND_GRID_API_KEY
    }
}));

/**
 * Handler to /login => GET
 * Render HTML: auth/login.ejs
 */
exports.getLogin = (req, res, next) => {
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        oldValues: {},
        errorFields: {}
    });
};

/**
 * Handler to /login => POST
 */
exports.postLogin = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const oldValues = errorHandlers.getOldValuesByFields(["password", "email"], req)
        const errorFields = errorHandlers.getErrorFields(errors);
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array({onlyFirstError: true})[0].msg,
            oldValues: oldValues,
            errorFields: errorFields
        })

    }
    User.findOne({email: email}).then(async user => {
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = user;
            req.session.isLoggedIn = true;
            req.session.save(err => {
                console.log(err);
                res.redirect("/");
            })
        } else {
            req.flash('error', LOGIN_ERROR_MSG);
            res.redirect('/login');
        }
    })
        .catch(err => next(new Error(err)));
};

/**
 * Handler to /logout => POST
 */
exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        console.log(err);
        res.redirect("/");
    });
};

/**
 * Handler to /signup => GET
 * Render HTML: auth/signup.ejs
 */
exports.getSignup = (req, res, next) => {
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        oldValues: {},
        errorFields: {}
    });
};

/**
 * Handler to /signup => POST
 */
exports.postSignup = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const userName = req.body.username;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const oldValues = errorHandlers.getOldValuesByFields(SIGNUP_FIELDS, req)
        const errorFields = errorHandlers.getErrorFields(errors);
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array({onlyFirstError: true})[0].msg,
            oldValues: oldValues,
            errorFields: errorFields
        })
    }
    try {
        const cryptPass = await bcrypt.hash(password, HASH_LEN);
        const newUser = new User({email: email, password: cryptPass, name: userName});
        newUser.save(() => {
            res.redirect('/login');
            transporter.sendMail({
                to: email,
                from: ADMIN_EMAIL,
                subject: REGISTER_EMAIL_SUBJECT,
                html: "<h1> Congratulations, go shopping!! </h1>"
            }).then().catch(error => next(new Error(error)));
        })
    } catch (e) {
        return next(new Error(e))
    }
};

/**
 * Handler to /reset-password => GET
 * Render HTML: auth/reset-password.ejs
 */
exports.getResetPassword = (req, res, next) => {
    res.render('auth/reset-password', {
        path: '/reset-password',
        pageTitle: 'Reset Password'
    });
};

/**
 * Handler to /reset/:token => POST
 */
exports.postNewPassword = (req, res, next) => {
    const userId = req.body.userId;
    User.findById(userId)
        .then(async user => {
            bcrypt.hash(req.body.password, HASH_LEN)
                .then(encPass => {
                    user.password = encPass;
                    user.resetTokenExp = undefined;
                    user.resetToken = undefined;
                    user.save().then(() => res.redirect('/login')).catch(error => next(new Error(error)));
                })
                .catch(err => next(new Error(err)));
        });
};

/**
 * Handler to /new-password => GET
 * Render HTML: auth/new-password.ejs
 */
exports.getNewPassword = async (req, res, next) => {
    const token = req.params.token;
    const user = await User.findOne({resetToken: token, resetTokenExp: {$gt: Date.now()}});
    if (user) {
        res.render('auth/new-password', {
            path: '/new-password',
            pageTitle: 'Update Password',
            userId: user._id.toString()
        })
    } else {
        res.redirect('/');
    }
};

/**
 * Handler to /reset-password => POST
 */
exports.postResetPassword = (req, res, next) => {
    let email = req.body.email;
    crypto.randomBytes(RESET_PASS_TOKEN_SIZE, async (err, buf) => {
        if (err) {
            console.log(err);
            return res.redirect('/reset-password');
        }
        const token = buf.toString('hex');
        try {
            const user = await User.findOne({email: email})
            if (user) {
                user.resetToken = token;
                user.resetTokenExp = Date.now() + ONE_HOUR_IN_MILLI;
                user.save()
                    .then(results => {
                        res.redirect('/');
                        return transporter.sendMail({
                            to: email,
                            from: ADMIN_EMAIL,
                            subject: "Reset Password",
                            html: `<p> You requested a password reset!!</p>
                      <p> To reset password click <a href='${req.protocol + "://" + req.get('host')}/reset/${token}'> Here </a> </p>`
                        });
                    })
                    .catch(error => next(new Error(error)))
            } else {
                req.flash('error', INVALID_EMAIL_ERROR_MSG);
                return res.redirect('/reset-password');
            }
        } catch (error) {
            return next(new Error(error));
        }
    })
};
