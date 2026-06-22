const express = require('express');
const router = express.Router();
const Project = require('../models/project');
const User = require('../models/user');
const { requireAuth } = require('../middlewares/authMiddleware');
const mongoose = require("mongoose");

router.get('/', requireAuth, async function (req, res, next) {
    const email = req.session.user.email;
    const projects = await Project.find();

    res.render('projects', { email, projects });
});

module.exports = router;