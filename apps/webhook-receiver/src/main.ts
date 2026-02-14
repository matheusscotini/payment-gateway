import "dotenv/config";
import express from "express";
import crypto from "crypto";

const app = express();

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

function sign(body: string) {
  return crypto
    .createHmac("sha256", process.env.WEBHOOK_SIGNING_SECRET!)
    .update(body)
    .digest("hex");
}

app.post("/webhook", (req: any, res) => {
  const signature = req.header("X-Signature");
  const rawBody = req.rawBody as string;

  const expected = sign(rawBody);
  const valid = signature === expected;

  console.log("\n--- WEBHOOK RECEIVED ---");
  console.log("Valid signature:", valid);
  console.log("Headers X-Signature:", signature);
  console.log("Body:", req.body);

  if (!valid) {
    return res.status(401).json({ ok: false, error: "Invalid signature" });
  }

  return res.status(200).json({ ok: true });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`Webhook receiver on http://localhost:${port}/webhook`));
