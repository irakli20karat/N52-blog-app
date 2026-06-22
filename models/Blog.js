const mongoose = require('mongoose');
const {mongo} = require("mongoose");
const { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_CONTENT_LENGTH } = require('../consts/consts')

const commentSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now
    },
    replies: [{
        content: {
            type: String,
            required: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        }
    }],
    likes: [{
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    }]
})

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: MAX_TITLE_LENGTH
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: MAX_DESCRIPTION_LENGTH
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: MAX_CONTENT_LENGTH
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    thumbnail: {
        type: String,
        default: '/images/thumbnails/all-blog-posts-placeholder.jpg'
    },
    comments: [commentSchema]
}, {
    timestamps: true
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;
