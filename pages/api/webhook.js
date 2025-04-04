import { Configuration, OpenAIApi } from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const body = req.body;

  const userMessage = body.events?.[0]?.message?.text || "こんにちは";

  // OpenAI設定
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  // GPTに問い合わせ
  const response = await openai.createChatCompletion({
    model: process.env.GPT_MODEL || "gpt-3.5-turbo",
    messages: [{ role: "user", content: userMessage }],
  });

  const replyText = response.data.choices[0].message.content;

  // LINEに返事を返す
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

  return res.status(200).send("OK");
}
