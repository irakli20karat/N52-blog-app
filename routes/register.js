const express = require('express');
const User = require('../models/user');
const router = express.Router();
const { MIN_PASSWORD_LENGTH } = require('../consts/consts');

router.get('/', function(req, res, next) {
    return res.render('register', { message: '', consts: { MIN_PASSWORD_LENGTH } });
});

router.post('/', async function(req, res, next) {
    const { email, password, confirmPassword } = req.body;
    if ( password !== confirmPassword ) {
        return res.render('register', { message: 'Passwords do not match'});
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        return res.render('register', { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`});
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
        return res.redirect('/');
    }
})

module.exports = router;