import fetch from "node-fetch";
import { Configuration, OpenAIApi } from "openai";

export default async function handler(req, res) {
  console.log("🟡 Webhookエンドポイントに到達");

  if (req.method !== "POST") {
    console.log("❌ POSTじゃないリクエストが来ました");
    return res.status(405).end();
  }

  const body = req.body;
  console.log("📦 body:", JSON.stringify(body));

  const userMessage = body?.events?.[0]?.message?.text || null;
  const replyToken = body?.events?.[0]?.replyToken;

  if (!userMessage || !replyToken) {
    console.log("❌ userMessage か replyToken が取得できません");
    return res.status(400).send("Bad request");
  }

  console.log("📩 受信メッセージ:", userMessage);

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  try {
    const response = await openai.createChatCompletion({
      model: process.env.GPT_MODEL || "gpt-3.5-turbo",
      messages: [{ role: "user", content: userMessage }],
    });

    const replyText = response.data.choices[0].message.content;
    console.log("🤖 GPTの返答:", replyText);

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    };

    const payload = {
      replyToken: replyToken,
      messages: [{ type: "text", text: replyText }],
    };

    const lineRes = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const lineText = await lineRes.text();

    if (!lineRes.ok) {
      console.log("🚨 LINE返信エラー:", lineText);
    } else {
      console.log("✅ LINEに返事を送りました");
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ 処理中のエラー:", err);
    return res.status(500).send("Internal Server Error");
  }
}
