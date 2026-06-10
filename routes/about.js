const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { requireAuth } = require('../middlewares/authMiddleware');
const mongoose = require("mongoose");

router.get('/', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;

    res.render('about', { email });
});

module.exports = router;