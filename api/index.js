const express = require('express');
const serverless = require('serverless-http');
const { handleEvents, printPrompts } = require('../app/index.js');
const config = require('../config/index.js');
const { validateLineSignature } = require('../middleware/index.js');
const storage = require('../storage/index.js');
const { fetchVersion, getVersion } = require('../utils/index.js');

const app = express();

// JSONリクエストの受信処理（LINE署名検証用）
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  },
}));

// トップページへのアクセス処理（任意）
app.get('/', (req, res) => {
  if (config.APP_URL) {
    res.redirect(config.APP_URL);
    return;
  }
  res.sendStatus(200);
});

// アプリケーションのバージョン情報表示
app.get('/info', async (req, res) => {
  const currentVersion = getVersion();
  const latestVersion = await fetchVersion();
  res.status(200).send({ currentVersion, latestVersion });
});

// LINEのWebhook処理用エンドポイント
app.post(config.APP_WEBHOOK_PATH, validateLineSignature, async (req, res) => {
  try {
    await storage.initialize();
    await handleEvents(req.body.events);
    res.sendStatus(200);
  } catch (err) {
    console.error(err.message);
    res.sendStatus(500);
  }
  if (config.APP_DEBUG) printPrompts();
});

// Vercel環境では、この部分が必須
module.exports = serverless(app);
