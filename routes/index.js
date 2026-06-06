const express = require('express');
const router = express.Router();

router.get('/', function (req, res, next) {
    if (req.session.user) {
        return res.redirect('/blogs');
    }

    res.redirect('/login')
});

module.exports = router;
