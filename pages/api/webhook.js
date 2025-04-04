export default function handler(req, res) {
  console.log("LINE webhook received!");
  return res.status(200).send("OK");
}
