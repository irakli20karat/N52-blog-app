const express = require('express');
const router = express.Router();
const Blog = require('../models/blog');
const User = require('../models/user');
const { requireAuth } = require('../middlewares/authMiddleware');
const { uploadThumbnail } = require('../middlewares/uploadMiddleware');
const mongoose = require("mongoose");
const { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_CONTENT_LENGTH } = require('../consts/consts')
const fs = require('fs');

function toggleReaction(target, userId, reaction) {
    const opposite = reaction === 'likes' ? 'dislikes' : 'likes';
    const existing = target[reaction].find(r => r.author.equals(userId));

    if (existing) {
        target[reaction].pull(existing._id);
        return;
    }

    target[reaction].push({author: userId});

    const oppositeExisting = target[opposite].find(r => r.author.equals(userId));
    if (oppositeExisting) {
        target[opposite].pull(oppositeExisting._id);
    }
}

router.get('/', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;
    const blogs = await Blog.find().limit(6).sort({ date: -1 }).populate("author", "email");
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

router.get('/:blogId', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;
    const blogId = req.params.blogId;

    try {
        const blog = await Blog.findById(blogId)
            .populate("author", "email")
            .populate("comments.author", "email")
            .populate("comments.replies.author", "email");

        if (!blog) {
            return res.redirect('/blogs')
        }

        const recentBlogPosts = await Blog.find({_id: {$ne: blogId}})
            .sort({date: -1})
            .limit(8)
            .populate("author", "email");

        const user = await User.findOne({email});
        const userId = user ? user._id.toString() : null;

        const blogs = await Blog.find().sort({ date: -1 }).limit(8).populate("author", "email")
        blogs.forEach(b => {
            if (!b.thumbnail) b.thumbnail = '/images/thumbnails/all-blog-posts-placeholder.jpg';
        })

        res.render("blog", {email, blog, blogs, recentBlogPosts, userId});
    } catch (error) {
        return res.redirect('/blogs')
    }
});

router.post('/:blogId/comments', requireAuth, async function (req, res, next) {
    const {content} = req.body;
    const email = req.session.user.email;
    const blogId = req.params.blogId;

    if (!content || !content.trim()) {
        return res.redirect(`/blogs/${blogId}`);
    }

    try {
        const user = await User.findOne({email});
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.redirect('/blogs')
        }

        blog.comments.push({author: user._id, content: content.trim()});
        await blog.save();

        res.redirect(`/blogs/${blogId}`);
    } catch (error) {
        console.log(error);
        next(createError(500));
    }
});

router.post('/:blogId/comments/:commentId/replies', requireAuth, async function (req, res, next) {
    const {content} = req.body;
    const email = req.session.user.email;
    const {blogId, commentId} = req.params;

    if (!content || !content.trim()) {
        return res.redirect(`/blogs/${blogId}`);
    }

    try {
        const user = await User.findOne({email});
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.redirect('/blogs')
        }

        const comment = blog.comments.id(commentId);

        if (!comment) {
            return res.redirect('/blogs')
        }

        comment.replies.push({author: user._id, content: content.trim()});
        await blog.save();

        res.redirect(`/blogs/${blogId}`);
    } catch (error) {
        console.log(error);
        next(createError(500));
    }
});

router.post('/:blogId/comments/:commentId/edit', requireAuth, async function (req, res, next) {
    const {content} = req.body;
    const email = req.session.user.email;
    const {blogId, commentId} = req.params;

    if (!content || !content.trim()) {
        return res.redirect(`/blogs/${blogId}#comment-${commentId}`);
    }

    try {
        const user = await User.findOne({email});
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.redirect('/blogs')
        }

        const comment = blog.comments.id(commentId);

        if (!comment) {
            return res.redirect('/blogs')
        }

        if (!comment.author.equals(user._id)) {
            return next(createError(403));
        }

        comment.content = content.trim();
        comment.editedAt = new Date();
        await blog.save();

        res.redirect(`/blogs/${blogId}#comment-${commentId}`);
    } catch (error) {
        console.log(error);
        next(createError(500));
    }
});

router.post('/:blogId/comments/:commentId/replies/:replyId/edit', requireAuth, async function (req, res, next) {
    const {content} = req.body;
    const email = req.session.user.email;
    const {blogId, commentId, replyId} = req.params;

    if (!content || !content.trim()) {
        return res.redirect(`/blogs/${blogId}#comment-${commentId}`);
    }

    try {
        const user = await User.findOne({email});
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.redirect('/blogs')
        }

        const comment = blog.comments.id(commentId);

        if (!comment) {
            return res.redirect('/blogs')
        }

        const reply = comment.replies.id(replyId);

        if (!reply) {
            return res.redirect('/blogs')
        }

        if (!reply.author.equals(user._id)) {
            return next(createError(403));
        }

        reply.content = content.trim();
        reply.editedAt = new Date();
        await blog.save();

        res.redirect(`/blogs/${blogId}#comment-${commentId}`);
    } catch (error) {
        console.log(error);
        next(createError(500));
    }
});

router.post('/:blogId/comments/:commentId/delete', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;
    const {blogId, commentId} = req.params;

    try {
        const user = await User.findOne({email});
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.redirect('/blogs')
        }

        const comment = blog.comments.id(commentId);

        if (!comment) {
            return res.redirect('/blogs')
        }

        const isCommentAuthor = comment.author.equals(user._id);
        const isBlogAuthor = blog.author.equals(user._id);

        if (!isCommentAuthor && !isBlogAuthor) {
            return next(createError(403));
        }

        blog.comments.pull(commentId);
        await blog.save();

        res.redirect(`/blogs/${blogId}#comments`);
    } catch (error) {
        console.log(error);
        next(createError(500));
    }
});

router.post('/:blogId/comments/:commentId/replies/:replyId/delete', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;
    const {blogId, commentId, replyId} = req.params;

    try {
        const user = await User.findOne({email});
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.redirect('/blogs')
        }

        const comment = blog.comments.id(commentId);

        if (!comment) {
            return res.redirect('/blogs')
        }

        const reply = comment.replies.id(replyId);

        const isReplyAUthor = reply.author.equals(user._id);
        const isBlogAuthor = blog.author.equals(user._id);

        if (!isReplyAUthor && !isBlogAuthor) {
            return next(createError(403));
        }

        comment.replies.pull(replyId);

        await blog.save();

        res.redirect(`/blogs/${blogId}#comments`);
    } catch (error) {
        console.log(error);
        next(createError(500));
    }
});

router.post('/:blogId/comments/:commentId/:reaction(like|dislike)', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;
    const {blogId, commentId, reaction} = req.params;

    try {
        const user = await User.findOne({email});
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.redirect('/blogs')
        }

        const comment = blog.comments.id(commentId);

        if (!comment) {
            return res.redirect('/blogs')
        }

        toggleReaction(comment, user._id, reaction === 'like' ? 'likes' : 'dislikes');
        await blog.save();

        res.redirect(`/blogs/${blogId}#comment-${commentId}`);
    } catch (error) {
        console.log(error);
        next(createError(500));
    }
});

router.post('/:blogId/comments/:commentId/replies/:replyId/:reaction(like|dislike)', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;
    const {blogId, commentId, replyId, reaction} = req.params;

    try {
        const user = await User.findOne({email});
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.redirect('/blogs')
        }

        const comment = blog.comments.id(commentId);
        const reply = comment && comment.replies.id(replyId);

        if (!reply) {
            return res.redirect('/blogs')
        }

        toggleReaction(reply, user._id, reaction === 'like' ? 'likes' : 'dislikes');
        await blog.save();

        res.redirect(`/blogs/${blogId}#comment-${commentId}`);
    } catch (error) {
        console.log(error);
        next(createError(500));
    }
});router.post('/:blogId/comments/:commentId/replies', requireAuth, async function (req, res, next) {
    const {content} = req.body;
    const email = req.session.user.email;
    const {blogId, commentId} = req.params;

    if (!content || !content.trim()) {
        return res.redirect(`/blogs/${blogId}`);
    }

    try {
        const user = await User.findOne({email});
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.redirect('/blogs')
        }

        const comment = blog.comments.id(commentId);

        if (!comment) {
            return res.redirect('/blogs')
        }

        comment.replies.push({author: user._id, content: content.trim()});
        await blog.save();

        res.redirect(`/blogs/${blogId}`);
    } catch (error) {
        console.log(error);
        next(createError(500));
    }
});

router.post('/:blogId/comments/:commentId/edit', requireAuth, async function (req, res, next) {
    const {content} = req.body;
    const email = req.session.user.email;
    const {blogId, commentId} = req.params;

    if (!content || !content.trim()) {
        return res.redirect(`/blogs/${blogId}#comment-${commentId}`);
    }

    try {
        const user = await User.findOne({email});
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.redirect('/blogs')
        }

        const comment = blog.comments.id(commentId);

        if (!comment) {
            return res.redirect('/blogs')
        }

        if (!comment.author.equals(user._id)) {
            return next(createError(403));
        }

        comment.content = content.trim();
        comment.editedAt = new Date();
        await blog.save();

        res.redirect(`/blogs/${blogId}#comment-${commentId}`);
    } catch (error) {
        console.log(error);
        next(createError(500));
    }
});

router.post('/:blogId/comments/:commentId/replies/:replyId/edit', requireAuth, async function (req, res, next) {
    const {content} = req.body;
    const email = req.session.user.email;
    const {blogId, commentId, replyId} = req.params;

    if (!content || !content.trim()) {
        return res.redirect(`/blogs/${blogId}#comment-${commentId}`);
    }

    try {
        const user = await User.findOne({email});
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.redirect('/blogs')
        }

        const comment = blog.comments.id(commentId);

        if (!comment) {
            return res.redirect('/blogs')
        }

        const reply = comment.replies.id(replyId);

        if (!reply) {
            return res.redirect('/blogs')
        }

        if (!reply.author.equals(user._id)) {
            return next(createError(403));
        }

        reply.content = content.trim();
        reply.editedAt = new Date();
        await blog.save();

        res.redirect(`/blogs/${blogId}#comment-${commentId}`);
    } catch (error) {
        console.log(error);
        next(createError(500));
    }
});

router.post('/:blogId/comments/:commentId/delete', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;
    const {blogId, commentId} = req.params;

    try {
        const user = await User.findOne({email});
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.redirect('/blogs')
        }

        const comment = blog.comments.id(commentId);

        if (!comment) {
            return res.redirect('/blogs')
        }

        const isCommentAuthor = comment.author.equals(user._id);
        const isBlogAuthor = blog.author.equals(user._id);

        if (!isCommentAuthor && !isBlogAuthor) {
            return next(createError(403));
        }

        blog.comments.pull(commentId);
        await blog.save();

        res.redirect(`/blogs/${blogId}#comments`);
    } catch (error) {
        console.log(error);
        next(createError(500));
    }
});

router.post('/:blogId/comments/:commentId/replies/:replyId/delete', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;
    const {blogId, commentId, replyId} = req.params;

    try {
        const user = await User.findOne({email});
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.redirect('/blogs')
        }

        const comment = blog.comments.id(commentId);

        if (!comment) {
            return res.redirect('/blogs')
        }

        const reply = comment.replies.id(replyId);

        const isReplyAUthor = reply.author.equals(user._id);
        const isBlogAuthor = blog.author.equals(user._id);

        if (!isReplyAUthor && !isBlogAuthor) {
            return next(createError(403));
        }

        comment.replies.pull(replyId);

        await blog.save();

        res.redirect(`/blogs/${blogId}#comments`);
    } catch (error) {
        console.log(error);
        next(createError(500));
    }
});

router.post('/:blogId/comments/:commentId/:reaction(like|dislike)', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;
    const {blogId, commentId, reaction} = req.params;

    try {
        const user = await User.findOne({email});
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.redirect('/blogs')
        }

        const comment = blog.comments.id(commentId);

        if (!comment) {
            return res.redirect('/blogs')
        }

        toggleReaction(comment, user._id, reaction === 'like' ? 'likes' : 'dislikes');
        await blog.save();

        res.redirect(`/blogs/${blogId}#comment-${commentId}`);
    } catch (error) {
        console.log(error);
        next(createError(500));
    }
});

router.post('/:blogId/comments/:commentId/replies/:replyId/:reaction(like|dislike)', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;
    const {blogId, commentId, replyId, reaction} = req.params;

    try {
        const user = await User.findOne({email});
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.redirect('/blogs')
        }

        const comment = blog.comments.id(commentId);
        const reply = comment && comment.replies.id(replyId);

        if (!reply) {
            return res.redirect('/blogs')
        }

        toggleReaction(reply, user._id, reaction === 'like' ? 'likes' : 'dislikes');
        await blog.save();

        res.redirect(`/blogs/${blogId}#comment-${commentId}`);
    } catch (error) {
        console.log(error);
        next(createError(500));
    }
});

router.get('/after/:id', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;

    const referenceBlog = await Blog.findById(req.params.id).select('date');

    const blogs = await Blog.find({ date: { $lt: referenceBlog.date } })
        .sort({ date: -1 })
        .limit(6)
        .populate('author', 'email');

    res.json(blogs);
});

module.exports = router;
