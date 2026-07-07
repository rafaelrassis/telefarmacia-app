import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import pharmacistRoutes from './routes/pharmacistRoutes.js';
import pacienteRoutes from './routes/pacienteRoutes.js';
import pagamentoRoutes from './routes/pagamentoRoutes.js';
import avaliacaoRoutes from './routes/avaliacaoRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import filaRoutes from './routes/filaRoutes.js';
import consultaRoutes from './routes/consultaRoutes.js';
import dependentRoutes from './routes/dependentRoutes.js';
import pushRoutes from './routes/pushRoutes.js';
import { getDocumentoUpload } from './controllers/ConsultaController.js';
import { getDocumentoIdentidade, DOC_IDENTIDADE_REGEX } from './controllers/PharmacistController.js';
import { authMiddleware } from './middlewares/authMiddleware.js';

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5174')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origem não permitida — ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting: 20 tentativas de login por IP a cada 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

// Receitas/encaminhamentos contêm dados de saúde — exigem checagem de dono,
// por isso são interceptados ANTES do static.
app.get('/uploads/receitas/:filename', authMiddleware, getDocumentoUpload);

// Documentos de identidade (RG/CRF) do onboarding de farmacêutico também são
// PII sensível — mesma estratégia. Fotos de perfil (padrão diferente de nome
// de arquivo) seguem para o static abaixo, sem exigir auth.
app.get('/uploads/:filename', (req, res, next) => {
  if (!DOC_IDENTIDADE_REGEX.test(req.params.filename)) return next();
  return authMiddleware(req, res, () => getDocumentoIdentidade(req, res));
});
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), message: 'API operante.' });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', userRoutes);
app.use('/api', pharmacistRoutes);
app.use('/api', pacienteRoutes);
app.use('/api', pagamentoRoutes);
app.use('/api', avaliacaoRoutes);
app.use('/api', adminRoutes);
app.use('/api', filaRoutes);
app.use('/api', consultaRoutes);
app.use('/api', dependentRoutes);
app.use('/api', pushRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado.' });
});

export default app;
