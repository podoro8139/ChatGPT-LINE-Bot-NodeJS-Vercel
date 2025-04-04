// node-fetch を使って fetch を有効化（VercelなどのNode.jsランタイム対策）
import fetch from "node-fetch";
import { Configuration, OpenAIApi } from "openai";

export default async function handler(req, res) {
  // POSTメソッド以外は拒否
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const body = req.body;

  // ユーザーのメッセージ取得（なければ "こんにちは"）
  const userMessage = body.events?.[0]?.message?.text || "こんにちは";

  console.log("✅ LINEからのメッセージ:", userMessage);

  // OpenAI設定
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  try {
    // ChatGPTにメッセージを送信
    const response = await openai.createChatCompletion({
      model: process.env.GPT_MODEL || "gpt-3.5-turbo",
      messages: [{ role: "user", content: userMessage }],
    });

    const replyText = response.data.choices[0].message.content;
    console.log("🤖 GPTの返答:", replyText);

    // LINEに返事を返す
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
      headers: headers,
      body: JSON.stringify(replyPayload),
    });

    if (!lineResponse.ok) {
      const errorDetails = await lineResponse.text();
      console.error("🚨 LINEへの返信エラー:", errorDetails);
    } else {
      console.log("✅ LINEに返事が送信されました！");
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ エラー:", err);
    return res.status(500).send("Internal Server Error");
  }
}
