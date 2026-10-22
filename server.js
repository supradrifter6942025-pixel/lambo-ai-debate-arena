
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;
const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const MODEL = "qwen2.5:0.5b";

app.use(express.json({ limit: "20kb" }));
app.use(express.static(__dirname));

app.post("/debate", async (req, res) => {
  const prompt = req.body && req.body.topic;

  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "A prompt is required." });
  }

  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt.trim() }],
        stream: false,
        options: {
          temperature: 0.6,
          num_predict: 40
        }
      }),
      signal: AbortSignal.timeout(120000)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: data.error || "Ollama returned an error. Is Ollama running?"
      });
    }

    const reply = data.message && data.message.content;

    if (!reply) {
      return res.status(502).json({ error: "The model returned no reply." });
    }

    res.json({ reply: reply.trim() });
  } catch (error) {
    console.error("Ollama error:", error.message);

    res.status(502).json({
      error: error.name === "TimeoutError"
        ? "The model took too long. Try again."
        : "Cannot reach Ollama. Check that Ollama is running and the model is installed."
    });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log("==================================");
  console.log(" LAMBO'S AI DEBATE ARENA");
  console.log("==================================");
  console.log("Website: http://localhost:" + PORT);
  console.log("Model: " + MODEL);
  console.log("Keep this window open!");
});
