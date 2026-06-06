const mongoose = require('mongoose');

require('dotenv').config()

const connectDB = () => {
    mongoose.connect(process.env.DB_CONNECTION_STRING)
        .then(() => console.log('MongoDB connected'))
        .catch(err => console.error('MongoDB connection error:', err));
}

module.exports = connectDB;