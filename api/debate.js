module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

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
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt.trim() }],
        temperature: 0.6,
        max_tokens: 400,
        reasoning_effort:'low"
      })
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

    const reply = data.choices && data.choices[0] &&
      data.choices[0].message && data.choices[0].message.content;

    if (!reply) {   console.error("Unexpected Groq response:", JSON.stringify(data));   return res.status(502).json({     error: "Groq returned an unexpected response. Check Vercel Runtime Logs."   }); }
    return res.status(200).json({ reply: reply.trim() });
  } catch (error) {
    console.error("Groq request failed:", error.message);
    return res.status(502).json({ error: "Could not reach the hosted AI service. Try again shortly." });
  }
};
