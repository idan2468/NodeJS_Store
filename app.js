// Includes //
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const fs = require('fs');
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const multer = require('multer');
const User = new require("./models/user");
const errorController = require("./controllers/error");
const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGO_URI;
const session = require('express-session');
const csrf = require('csurf');
const flash = require('connect-flash');
const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
////////////////


const mongoDBStore = require('connect-mongodb-session')(session);
const app = express();
const csrfProtection = csrf();
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    }
    , filename: (req, file, cb) => {
        const fileNameStr = Date.now() + " - " + file.originalname;
        cb(null, fileNameStr);
    }
});

const fileFilterFunc = (req, file, cb) => {
    if (file.mimetype.includes('image/')) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const mongoStore = new mongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions'
})

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'});


/**
 * Set views and view engine
 */
app.set("view engine", "ejs");
app.set("views", "views");

app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(compression());
app.use(morgan('combined', {stream: accessLogStream}));
app.use(bodyParser.urlencoded({extended: false}));
app.use(multer({storage: fileStorage, fileFilter: fileFilterFunc}).single('image'));
app.use(express.static(path.join(__dirname, "public")));
app.use('/images', express.static(path.join(__dirname, "images")));

/**
 * Initialize session
 */
app.use(session({
    secret: 'My Secret',
    resave: false,
    saveUninitialized: false,
    store: mongoStore
}));

app.use(flash());
app.use(csrfProtection);

/**
 * Handle getting mongoose user object by the current session
 */
app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id)
        .then((user) => {
            if (!user) {
                return next();
            }
            req.user = user;
            next();
        })
        .catch((err) => {
            return next(new Error(err));
        });
});

/**
 * Adding default render vars
 */
app.use((req, res, next) => {
    let message = req.flash('error');
    message = message.length === 0 ? undefined : message[0];
    res.locals.isAuth = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    res.locals.errorMessage = message;
    next();
});

/**
 * Install all routes from /routes
 */
app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

/**
 * Errors Handlers
 */
app.get('/500', errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
    console.log(error);
    if(req.flash){
        req.flash('error', error.message);
    }
    return res.redirect("/500");
})

/**
 * Connect to MongoDB and start the server.
 */
mongoose.connect(MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true})
    .then((res) => {
        if(!fs.existsSync('images')){
            fs.mkdirSync('images');
        }
        app.listen(process.env.PORT || 3000);
    });
