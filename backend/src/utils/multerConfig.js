import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user.id}_${file.fieldname}_${Date.now()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato não suportado. Use JPG, PNG ou PDF.'), false);
  }
};

export const uploadDocs = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([
  { name: 'foto_rg_cnh', maxCount: 1 },
  { name: 'foto_crf',    maxCount: 1 },
]);

export const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('photo');
