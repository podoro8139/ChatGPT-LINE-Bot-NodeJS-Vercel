import fetch from "node-fetch";
import { Configuration, OpenAIApi } from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const body = req.body;
  const userMessage = body.events?.[0]?.message?.text || "こんにちは";

  console.log("📩 受信メッセージ:", userMessage);
  console.log("📦 replyToken:", body.events?.[0]?.replyToken);

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

    const replyPayload = {
      replyToken: body.events[0].replyToken,
      messages: [{ type: "text", text: replyText }],
    };

    const lineResponse = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers,
      body: JSON.stringify(replyPayload),
    });

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();
      console.error("🚨 LINEへの返信エラー:", errorText);
    } else {
      console.log("✅ LINEに返事を送信しました！");
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ 処理中のエラー:", err);
    return res.status(500).send("Internal Server Error");
  }
}
