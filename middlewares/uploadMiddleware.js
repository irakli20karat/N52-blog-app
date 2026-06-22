const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'public', 'images', 'uploads');
fs.mkdirSync(uploadDir, {recursive: true});

const allowedThumbnailTypes = ['image/jpeg', 'image/png'];

const thumbnailUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `thumbnail-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        }
    }),
    limits: {fileSize: 5 * 1024 * 1024},
    fileFilter: (req, file, cb) => {
        if (allowedThumbnailTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(null, false);
        }
    }
}).single('thumbnail');

const uploadThumbnail = (req, res, next) => {
    thumbnailUpload(req, res, (err) => {
        if (err) {
            const email = req.session.user.email;
            return res.render('new_blog', {email, error: 'Thumbnail upload failed. Use an image under 5MB.'});
        }
        next();
    });
}

module.exports = {uploadThumbnail}