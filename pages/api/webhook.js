import fetch from "node-fetch";
import { Configuration, OpenAIApi } from "openai";

export default async function handler(req, res) {
  console.log("🟡🟡🟡 Webhookエンドポイントに到達！");

  if (req.method !== "POST") {
    console.log("❌ POSTメソッドじゃないリクエストが来ました！");
    return res.status(405).end();
  }

  const body = req.body;
  console.log("📦 リクエストbody:", JSON.stringify(body));

  const userMessage = body.events?.[0]?.message?.text || null;
  const replyToken = body.events?.[0]?.replyToken || null;

  if (!userMessage || !replyToken) {
    console.log("❌ メッセージまたはreplyTokenが見つかりません");
    return res.status(400).send("Bad request");
  }

  console.log("💬 受信メッセージ:", userMessage);

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  let replyText = "申し訳ありません、エラーが発生しました。";

  try {
    const response = await openai.createChatCompletion({
      model: process.env.GPT_MODEL || "gpt-3.5-turbo",
      messages: [{ role: "user", content: userMessage }],
    });

    replyText = response.data.choices[0].message.content;
    console.log("✅ GPT応答:", replyText);
  } catch (error) {
    console.error("🚨 OpenAIエラー:", error);
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
  };

  try {
    const lineRes = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        replyToken: replyToken,
        messages: [{ type: "text", text: replyText }],
      }),
    });

    console.log("📩 LINE返信ステータス:", lineRes.status);
  } catch (error) {
    console.error("🚨 LINE返信エラー:", error);
  }

  return res.status(200).send("OK");
}
