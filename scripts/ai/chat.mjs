import fs from "fs";

const MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:14b";
const QUESTION = process.argv.slice(2).join(" ");

if (!QUESTION) throw new Error('Usage: node scripts/ai/chat-local.mjs "your question"');

const ctx = JSON.parse(fs.readFileSync(0, "utf8"));

const prompt = [
  "You are a senior software architect and code assistant.",
  "Use ONLY the provided project context. Be concrete and practical.",
  "",
  "QUESTION:",
  QUESTION,
  "",
  "PROJECT CONTEXT:",
  JSON.stringify(ctx),
].join("\n");

const res = await fetch("http://localhost:11434/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: MODEL,
    prompt,
    stream: false
  }),
});

if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);

const data = await res.json();
console.log(data.response || "");