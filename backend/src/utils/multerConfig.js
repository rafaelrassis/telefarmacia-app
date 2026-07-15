import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
// Caminho absoluto (mesma convenção de app.js/ConsultaController.js) — evita
// gravar em diretório diferente do que é servido, dependendo do cwd do processo.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads');

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
    const err = new Error('Formato não suportado. Use JPG, PNG ou PDF.');
    err.statusCode = 400;
    cb(err, false);
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

// Anexo da receita a interpretar, enviado pelo paciente — nome do arquivo
// fixo por consulta (sobrescreve em reenvio), separado em subpasta própria
// porque é servido por uma rota autenticada dedicada (ver
// ConsultaController.getAnexoReceita), nunca pelo static público.
const anexoReceitaDir = path.join(UPLOAD_DIR, 'anexos');
if (!fs.existsSync(anexoReceitaDir)) {
  fs.mkdirSync(anexoReceitaDir, { recursive: true });
}

const anexoReceitaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, anexoReceitaDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `anexo-receita-${req.params.id}${ext}`);
  },
});

export const uploadAnexoReceita = multer({
  storage: anexoReceitaStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('anexo');
