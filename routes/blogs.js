const express = require('express');
const router = express.Router();
const Blog = require('../models/blog');
const User = require('../models/user');
const { requireAuth } = require('../middlewares/authMiddleware');
const { uploadThumbnail } = require('../middlewares/uploadMiddleware');
const mongoose = require("mongoose");
const { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_CONTENT_LENGTH } = require('../consts/consts')
const fs = require('fs');

router.get('/', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;
    const blogs = await Blog.find().sort({ date: -1 }).populate("author", "email")
    blogs.forEach(b => {
        if (!b.thumbnail) b.thumbnail = '/images/thumbnails/all-blog-posts-placeholder.jpg';
    })

    res.render('blogs', { email, blogs });
});

router.get('/new', requireAuth, function (req, res, next) {
    const email = req.session.user.email;
    res.render('new_blog', { email, error: null, consts: { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_CONTENT_LENGTH } });
})

router.post('/new', requireAuth, uploadThumbnail, async function (req, res, next) {
    const { title, description, content } = req.body;
    const email = req.session.user.email;

    const renderError = (error) => {
        if (req.file) {
            fs.unlink(req.file.path, () => { });
        }
        return res.render('new_blog', { email, error });
    };

    if (!title.trim() || !description.trim() || !content.trim()) {
        return res.render('new_blog', { email, error: 'Missing required field' });
    }

    console.log(MAX_TITLE_LENGTH);
    if (title.length > MAX_TITLE_LENGTH) {
        return res.render('new_blog', { email, error: `Title length must be less than ${MAX_TITLE_LENGTH} characters` });
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
        return res.render('new_blog', { email, error: `Description length must be less than ${MAX_DESCRIPTION_LENGTH} characters` });
    }

    if (content.length > MAX_CONTENT_LENGTH) {
        return res.render('new_blog', { email, error: `Content length must be less than ${MAX_CONTENT_LENGTH} characters` });
    }

    const user = await User.findOne({ email });

    const userID = user._id.toString();

    const newBlogObj = {
        title,
        description,
        content,
        thumbnail: `/images/uploads/${req.file.filename}`,
        author: userID,
    };

    try {
        const newBlog = new Blog(newBlogObj);
        await newBlog.save();

        res.redirect('/blogs');
    } catch (error) {
        console.log(error);
        if (req.file) {
            fs.unlink(req.file.path, () => { });
        }
        res.redirect('/blogs/new')
    }
})

router.get('/:id', requireAuth, async function (req, res, next) {
    const id = req.params.id;

    try {
        const blog = await Blog.findOne({ _id: id }).populate("author");

        if (!blog) {
            res.redirect('/blogs');
        }

        const email = req.session.user.email;
        const blogs = await Blog.find().sort({ date: -1 }).limit(8).populate("author", "email")
        blogs.forEach(b => {
            if (!b.thumbnail) b.thumbnail = '/images/thumbnails/all-blog-posts-placeholder.jpg';
        })

        res.render('blog', { email, blogs, blog });
    } catch {
        res.redirect('/blogs');
    }
})

module.exports = router;
