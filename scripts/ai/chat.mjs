import fs from "fs";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const QUESTION = process.argv.slice(2).join(" ");

if (!ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
if (!QUESTION) throw new Error('Usage: node scripts/ai/chat.mjs "your question"');

const ctx = JSON.parse(fs.readFileSync(0, "utf8"));

const prompt = [
  "You are a senior software architect. Use the provided project context.",
  "Return: 1) findings 2) recommended structure 3) next actions with file paths.",
  "",
  "QUESTION:",
  QUESTION,
  "",
  "PROJECT CONTEXT (files):",
  JSON.stringify(ctx),
].join("\n");

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
  model: "claude-haiku-4-5",
  max_tokens: 1200,
  messages: [{ role: "user", content: prompt }],
}),
});

if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text()}`);

const data = await res.json();
const text = (data.content || [])
  .filter(b => b.type === "text")
  .map(b => b.text)
  .join("\n");

console.log(text || JSON.stringify(data, null, 2));