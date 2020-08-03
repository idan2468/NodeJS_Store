exports.get404 = (req, res, next) => {
    res.status(404).render('error/404', {
        pageTitle: 'Page Not Found', path: '/404'
    });
};


exports.get500 = (req, res, next) => {
    return res.status(500).render('error/500', {
        pageTitle: 'Page 500', path: '/500'
    });
};

