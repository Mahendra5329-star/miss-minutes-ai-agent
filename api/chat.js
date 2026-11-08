// Vercel serverless function. Keep OPENAI_API_KEY on the server; never put it in app.js.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Send a POST request.' });
  }

  // Vercel usually parses JSON bodies, but handle a string body as well.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: 'Request body must be valid JSON.' }); }
  }

  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 4000) {
    return res.status(400).json({ error: 'Message must contain 1–4000 characters.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY is not configured for this deployment.');
    return res.status(503).json({ error: 'AI is not configured. Check the Vercel Production environment variable.' });
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        instructions: 'You are Miss Minutes, a friendly, playful, concise clock-themed personal assistant. Do not claim to access devices, timelines, private files, or perform actions you cannot actually perform. Be clear when a task requires the user to tap a control.',
        input: message,
        max_output_tokens: 500
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      // Log the provider status for debugging, but never log the secret API key.
      console.error('OpenAI API request failed:', upstream.status, data?.error?.code || data?.error?.type || 'unknown_error');
      if (upstream.status === 401) {
        return res.status(502).json({ error: 'OpenAI rejected the API key. Check the key stored in Vercel.' });
      }
      if (upstream.status === 429) {
        return res.status(502).json({ error: 'OpenAI rate limit or API quota reached. Check the API account billing and usage.' });
      }
      return res.status(502).json({ error: `OpenAI could not complete the request (provider status ${upstream.status}).` });
    }

    const reply = (data.output || [])
      .flatMap((item) => item.content || [])
      .filter((part) => part.type === 'output_text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('\n')
      .trim();

    if (!reply) {
      console.error('OpenAI returned no output text.');
      return res.status(502).json({ error: 'The AI returned an empty response. Please try again.' });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Miss Minutes API function error:', error?.message || 'unknown error');
    return res.status(500).json({ error: 'Assistant service temporarily unavailable. Please try again.' });
  }
}
