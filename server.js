import { spawn } from 'child_process';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// НАЛАШТУВАННЯ TELEGRAM-БОТА
// Вставте токен вашого бота (від @BotFather) у TELEGRAM_BOT_TOKEN
// та ваш числовий Chat ID (наприклад від @userinfobot) у TELEGRAM_CHAT_ID.
// ============================================================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'ВСТАВТЕ_ТОКЕН_БОТА_СЮДИ';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'ВСТАВТЕ_ID_КОРИСТУВАЧА_СЮДИ';

const PORT = Number(process.env.PORT) || 3000;
const ENABLE_SERVEO =
  process.env.ENABLE_SERVEO !== 'false' && !process.env.K_SERVICE && !process.env.APP_URL;
const SERVEO_HOST = process.env.SERVEO_HOST || 'serveo.net';

const DATA_DIR = path.join(__dirname, 'data');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

function readStats() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STATS_FILE)) {
      const initial = { totalCompleted: 0 };
      fs.writeFileSync(STATS_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(STATS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      totalCompleted:
        typeof parsed.totalCompleted === 'number' && parsed.totalCompleted >= 0
          ? parsed.totalCompleted
          : 0,
    };
  } catch {
    return { totalCompleted: 0 };
  }
}

function writeStats(stats) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmp = `${STATS_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(stats, null, 2), 'utf-8');
    fs.renameSync(tmp, STATS_FILE);
  } catch (err) {
    console.error('Failed to persist stats.json:', err);
  }
}

function isTelegramConfigured() {
  return Boolean(
    TELEGRAM_BOT_TOKEN &&
      TELEGRAM_CHAT_ID &&
      TELEGRAM_BOT_TOKEN !== 'ВСТАВТЕ_ТОКЕН_БОТА_СЮДИ' &&
      TELEGRAM_CHAT_ID !== 'ВСТАВТЕ_ID_КОРИСТУВАЧА_СЮДИ'
  );
}

async function sendTelegramMessage(text) {
  if (!isTelegramConfigured()) {
    return {
      sent: false,
      reason: 'TELEGRAM_BOT_TOKEN або TELEGRAM_CHAT_ID ще не заповнені у server.js',
    };
  }

  try {
    const endpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Telegram API error:', response.status, errBody);
      return { sent: false, reason: `Telegram API HTTP ${response.status}` };
    }

    return { sent: true };
  } catch (err) {
    console.error('Telegram request failed:', err);
    return { sent: false, reason: err instanceof Error ? err.message : 'Network error' };
  }
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function startServeoTunnel(localPort) {
  if (!ENABLE_SERVEO) {
    return null;
  }

  console.log(`Запуск глобального тунелю Serveo (${SERVEO_HOST} -> localhost:${localPort})...`);

  const sshArgs = [
    '-o',
    'StrictHostKeyChecking=no',
    '-o',
    'ExitOnForwardFailure=yes',
    '-o',
    'ServerAliveInterval=60',
    '-R',
    `80:localhost:${localPort}`,
    SERVEO_HOST,
  ];

  const tunnel = spawn('ssh', sshArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let linkSent = false;

  const handleChunk = async (chunk) => {
    const cleanText = stripAnsi(chunk.toString('utf-8'));
    const match = cleanText.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (match && !linkSent) {
      linkSent = true;
      const publicUrl = match[0].replace(/\/$/, '');
      console.log(`Глобальне посилання Serveo готове: ${publicUrl}`);

      const message = [
        'Сервер запущено та опубліковано через Serveo!',
        '',
        'Посилання для респондентів (опитування):',
        publicUrl,
      ].join('\n');

      const result = await sendTelegramMessage(message);
      if (result.sent) {
        console.log('Посилання Serveo успішно надіслано у Telegram.');
      } else {
        console.log(`Telegram не надіслано: ${result.reason}`);
      }
    }
  };

  tunnel.stdout.on('data', handleChunk);
  tunnel.stderr.on('data', handleChunk);

  tunnel.on('error', (err) => {
    console.error('Не вдалося запустити SSH-тунель Serveo:', err.message);
  });

  tunnel.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.warn(`Тунель Serveo завершився з кодом ${code}. Сайт працює на http://localhost:${localPort}`);
    }
  });

  return tunnel;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    const stats = readStats();
    res.json({
      ok: true,
      telegramConfigured: isTelegramConfigured(),
      totalCompleted: stats.totalCompleted,
    });
  });

  // Синхронізація лічильника з фактичною кількістю записів у базі (викликається адміністратором)
  app.post('/api/stats/sync', (req, res) => {
    const count = Number(req.body?.totalCompleted);
    if (!Number.isFinite(count) || count < 0) {
      res.status(400).json({ error: 'Invalid count' });
      return;
    }
    const nextStats = { totalCompleted: Math.round(count) };
    writeStats(nextStats);
    res.json(nextStats);
  });

  // Надсилання сповіщення в Telegram після проходження тесту респондентом
  app.post('/api/notify-telegram', async (req, res) => {
    try {
      const stats = readStats();
      const totalCompleted = stats.totalCompleted + 1;
      writeStats({ totalCompleted });

      const body = req.body || {};

      const lines = [
        'Нове проходження психологічного тестування!',
        '',
        `Стать: ${body.gender || 'Не вказано'} · Вік: ${body.age ?? '—'} р.`,
        `Індекс асертивності (Каппоні-Новак): ${body.assertivenessIndex ?? '—'}%`,
        `Самооцінка (Дембо-Рубінштейн): ${body.realMean ?? '—'} / 10 (домагання: ${body.aspirationMean ?? '—'})`,
        `Особистісна тривожність (Спілбергер-Ханін): ${body.anxietyScore ?? '—'} / 80`,
        '',
        `Всього тестів вже зроблено: ${totalCompleted}`,
      ];

      const result = await sendTelegramMessage(lines.join('\n'));
      res.json({
        ok: true,
        totalCompleted,
        telegramSent: result.sent,
        reason: result.reason,
      });
    } catch (err) {
      console.error('Failed to handle /api/notify-telegram:', err);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  const distPath = path.join(__dirname, 'dist');
  const useProdStatic =
    process.env.NODE_ENV === 'production' ||
    (fs.existsSync(distPath) && !fs.existsSync(path.join(__dirname, 'node_modules', 'vite')));

  if (!useProdStatic) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущено: http://localhost:${PORT}`);
    const tunnel = startServeoTunnel(PORT);

    const shutdown = () => {
      if (tunnel && !tunnel.killed) {
        tunnel.kill();
      }
      server.close(() => process.exit(0));
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}

startServer();
