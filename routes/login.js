const express = require('express');
const User = require('../models/user');
const router = express.Router();
const bcrypt = require('bcrypt');

router.get('/', function(req, res, next) {
    return res.render('login', { message: '' });
});

router.post('/', async function(req, res, next) {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('login', { message: 'Invalid email or password' });
        }

        if (!bcrypt.compareSync(password, user.password)) {
            return res.render('login', { message: 'Invalid email or password' });
        }

        req.session.user = {
            email
        };
        res.redirect('/blogs');
    } catch (error) {
        console.log(error);
        return res.render('login', { message: 'Server error', error});
    }
})

module.exports = router;