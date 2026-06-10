const express = require('express');
const router = express.Router();
const Blog = require('../models/blog');
const User = require('../models/user');
const { requireAuth } = require('../middlewares/authMiddleware');
const mongoose = require("mongoose");

router.get('/', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;
    const blogs = await Blog.find().sort({ date: -1 }).populate("author", "email")

    res.render('blogs', { email, blogs });
});

router.get('/:id', requireAuth, async function (req, res, next) {
    const id = req.params.id;

    try {
        const blog = await Blog.findOne({ _id: id });

        if (!blog) {
            res.redirect('/blogs');
        }

        const email = req.session.user.email;
        const blogs = await Blog.find().sort({ date: -1 }).limit(8).populate("author", "email")

        res.render('blog', { email, blogs, blog });
    } catch {
        res.redirect('/blogs');
    }
})

router.get('/new', requireAuth, function (req, res, next) {
    const email = req.session.user.email;
    res.render('new_blog', { email, error: null });
})

router.post('/new', requireAuth, async function (req, res, next) {
    const { title, description, content } = req.body;
    const email = req.session.user.email;

    if (!title.trim() || !description.trim() || !content.trim()) {
        res.render('new_blog', { email, error: 'Missing required field' });
    }

    if (title.length > 40) {
        res.render('new_blog', { email, error: 'Title length must be less than 40 characters' });
    }

    if (description.length > 200) {
        res.render('new_blog', { email, error: 'Description length must be less than 200 characters' });
    }

    if (content.length > 2000) {
        res.render('new_blog', { email, error: 'Content length must be less than 2000 characters' });
    }

    const user = await User.findOne({ email });

    const userID = user._id.toString();

    const newBlogObj = {
        title,
        description,
        content,
        author: userID,
    };

    try {
        const newBlog = new Blog(newBlogObj);
        await newBlog.save();

        res.redirect('/blogs');
    } catch (error) {
        console.log(error);
    }
})

module.exports = router;
