import 'dotenv/config';
import app from './src/app.js';
import { initCronJobs } from './src/cronJobs.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 [Server] Backend rodando na porta ${PORT}`);
    });
    initCronJobs();
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    process.exit(1);
  }
};

startServer();
