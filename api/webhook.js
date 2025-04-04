// pages/api/webhook.js

import { Configuration, OpenAIApi } from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const body = req.body;

  // LINEからのメッセージを取得
  const userMessage = body.events?.[0]?.message?.text || "こんにちは";

  // OpenAI設定
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  // GPTに問い合わせ
  const response = await openai.createChatCompletion({
    model: "gpt-4", // または gpt-3.5-turbo
    messages: [{ role: "user", content: userMessage }],
  });

  const replyText = response.data.choices[0].message.content;

  // LINEへの返信
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
  };

  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      replyToken: body.events[0].replyToken,
      messages: [{ type: "text", text: replyText }],
    }),
  });

  res.status(200).send("OK");
}
