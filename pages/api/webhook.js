import fetch from "node-fetch";
import { buffer } from "micro";
import { Configuration, OpenAIApi } from "openai";

// LINE Webhook対応：BodyParserを無効化
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log("🟡 Webhookエンドポイントに到達");

  if (req.method !== "POST") {
    console.log("❌ POSTじゃないリクエストが来ました");
    return res.status(405).end();
  }

  try {
    const rawBody = await buffer(req);
    const body = JSON.parse(rawBody.toString());
    console.log("📦 受信Body:", JSON.stringify(body));

    const userMessage = body.events?.[0]?.message?.text || null;
    const replyToken = body.events?.[0]?.replyToken || null;

    if (!userMessage || !replyToken) {
      console.log("❌ userMessage または replyToken が取得できません");
      return res.status(400).send("Bad request");
    }

    console.log("📩 ユーザーのメッセージ:", userMessage);

    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

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

    const replyPayload = {
      replyToken: replyToken,
      messages: [{ type: "text", text: replyText }],
    };

    const lineResponse = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(replyPayload),
    });

    if (!lineResponse.ok) {
      const errorDetail = await lineResponse.text();
      console.log("🚨 LINE返信失敗:", errorDetail);
    } else {
      console.log("✅ LINEに返事を送信しました");
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ 処理中のエラー:", err);
    return res.status(500).send("Internal Server Error");
  }
}
