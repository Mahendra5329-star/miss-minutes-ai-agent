
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Use POST."
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is missing in Vercel."
    });
  }

  try {
    const { message, messages } = req.body || {};

    const conversation = Array.isArray(messages)
      ? messages
      : [{ role: "user", content: String(message || "") }];

    if (!conversation.length) {
      return res.status(400).json({
        error: "No message received."
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
          input: conversation
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", response.status, data);

      return res.status(502).json({
        error: "OpenAI request failed.",
        status: response.status
      });
    }

    const reply =
      data.output_text ||
      "I received your message but could not generate a reply.";

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Backend error:", error);

    return res.status(500).json({
      error: "Backend request failed."
    });
  }
}
