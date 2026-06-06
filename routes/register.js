const express = require('express');
const User = require('../models/user');
const router = express.Router();

router.get('/', function(req, res, next) {
    return res.render('register', { message: '' });
});

router.post('/', async function(req, res, next) {
    const { email, password, confirmPassword } = req.body;
    if ( password !== confirmPassword ) {
        return res.render('register', { message: 'Passwords do not match'});
    }

    if (password.length < 8) {
        return res.render('register', { message: 'Password must be at least 8 characters'});
    }

    try {
        const exists = await User.findOne({ email });
        if (exists) {
            return res.render('register', { message: 'Email already in use'});
        }

        const newUser = new User({
            email,
            password
        })

        await newUser.save();

        req.session.user = {
            email
        }

        return res.redirect('/blogs');
    } catch (error) {
        console.log(error);
        return res.render('register', { message: 'Server error', error});
    }
})

module.exports = router;