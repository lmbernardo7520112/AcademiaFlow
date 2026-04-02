import 'dotenv/config';
import { buildApp } from './app.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`🚀 AcademiaFlow API running at http://localhost:${PORT}`);

    // Garante que a porta 3000 seja liberada assim que o tsx reiniciar o processo
    ['SIGINT', 'SIGTERM'].forEach((signal) => {
      process.on(signal, async () => {
        await app.close();
        process.exit(0);
      });
    });

  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
