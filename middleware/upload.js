const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDirectory = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(extension, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .toLowerCase();

    callback(null, `${timestamp}-${safeName}${extension}`);
  },
});

const imageOnly = (req, file, callback) => {
  if (file.mimetype.startsWith('image/')) {
    callback(null, true);
  } else {
    callback(new Error('Only image uploads are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter: imageOnly,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;
