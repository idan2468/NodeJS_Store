/**
 *  Middleware to validate that the user logged in to access restricted paths
 */
module.exports = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.redirect('/login');
    }
    next();
}