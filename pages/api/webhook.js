import fetch from "node-fetch";
import { Configuration, OpenAIApi } from "openai";
import { buffer } from "micro";

export const config = {
  api: {
    bodyParser: false, // LINE Webhook対応のため無効化
  },
};

export default async function handler(req, res) {
  console.log("🟡 Webhookエンドポイントに到達");

  if (req.method !== "POST") {
    console.log("❌ POSTじゃないリクエストが来ました");
    return res.status(405).end();
  }

  try {
    const buf = await buffer(req);
    const bodyText = buf.toString("utf-8");
    const body = JSON.parse(bodyText);
    console.log("📩 body:", JSON.stringify(body));

    const userMessage = body.events?.[0]?.message?.text || null;
    const replyToken = body.events?.[0]?.replyToken || null;

    if (!userMessage || !replyToken) {
      console.log("❌ userMessageかreplyTokenが取得できません");
      return res.status(400).send("Bad request");
    }

    console.log("📝 受信メッセージ:", userMessage);

    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    const response = await openai.createChatCompletion({
      model: process.env.GPT_MODEL || "gpt-3.5-turbo",
      messages: [{ role: "user", content: userMessage }],
    });

    const replyText = response.data.choices[0].message.content;
    console.log("🤖 GPT応答:", replyText);

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    };

    await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        replyToken: replyToken,
        messages: [{ type: "text", text: replyText }],
      }),
    });

    console.log("✅ LINEに返答を送信しました");
    return res.status(200).send("OK");
  } catch (err) {
    console.error("🚨 エラー発生:", err);
    return res.status(500).send("Internal Server Error");
  }
}
