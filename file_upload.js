const multer = require('multer');
const path = require('path');

const storageSaving = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'data/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});