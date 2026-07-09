import 'dotenv/config';
import './monitoring/instrument.js';
import * as Sentry from '@sentry/node';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './utils/logger.js';

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

// API pura (nunca serve HTML) e uploads consumidos como <img>/<a> a partir do
// domínio do frontend (origem diferente) — CSP não se aplica a JSON e a
// política padrão de mesmo-origin do CORP bloquearia a exibição das imagens
// enviadas (RG/CRF, receitas) no frontend.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Request id curto por requisição, propagado no header de resposta e usado
// em todo log estruturado da requisição — facilita correlacionar um erro
// reportado pelo usuário com as linhas de log correspondentes. Log de
// acesso (nível info) desligado em teste para não poluir a saída do vitest;
// erros continuam logados normalmente em qualquer ambiente.
app.use((req, res, next) => {
  req.id = crypto.randomBytes(4).toString('hex');
  res.setHeader('X-Request-Id', req.id);
  if (process.env.NODE_ENV !== 'test') {
    const startedAt = Date.now();
    res.on('finish', () => {
      logger.info('request', {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });
  }
  next();
});

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
// Em testes, todas as requisições do Supertest saem do mesmo "IP" (loopback),
// então o limite seria atingido em poucos arquivos de teste — desligado com
// NODE_ENV=test (nunca em produção).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
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

// Precisa vir depois de todas as rotas — captura no Sentry qualquer erro
// encaminhado via next(err) (inclusive rejeições de promises assíncronas,
// que o Express 5 já encaminha automaticamente).
Sentry.setupExpressErrorHandler(app);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Erro não tratado', {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    message: err.message,
  });
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

export default app;
