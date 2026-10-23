const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/debate", async (req, res) => {
  const prompt = req.body && req.body.topic;

  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "A prompt is required." });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "The hosted AI key is not configured yet. Add GROQ_API_KEY in Vercel Project Settings > Environment Variables."
    });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt.trim() }],
        temperature: 0.6,
        max_tokens: 180
      }),
      signal: AbortSignal.timeout(55000)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", response.status, data);
      return res.status(response.status === 429 ? 429 : 502).json({
        error: response.status === 429
          ? "Groq rate limit reached. Wait a little and try again."
          : "The hosted AI service returned an error. Check the API key and Groq account."
      });
    }

    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

    if (!reply) {
      return res.status(502).json({ error: "The model returned no reply." });
    }

    return res.json({ reply: reply.trim() });
  } catch (error) {
    console.error("Groq request failed:", error.message);
    return res.status(502).json({
      error: error.name === "TimeoutError"
        ? "The model took too long. Try again."
        : "Could not reach the hosted AI service. Try again shortly."
    });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log("==================================");
    console.log(" LAMBO'S AI DEBATE ARENA");
    console.log("==================================");
    console.log("Website: http://localhost:" + PORT);
    console.log("AI: Groq hosted API");
  });
}

module.exports = app;
