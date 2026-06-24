const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Blog = require('../models/blog')
const { requireAuth } = require('../middlewares/authMiddleware');
const mongoose = require("mongoose");

router.get('/', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;
    const blogs = await Blog.find().sort({ date: -1 }).limit(3).populate("author", "email")

    blogs.forEach(b => {
        if (!b.thumbnail) b.thumbnail = '/images/thumbnails/all-blog-posts-placeholder.jpg';
    })

    res.render('newsletter', { email, blogs });
});

module.exports = router;