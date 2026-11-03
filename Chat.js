// Vercel serverless function. Keep OPENAI_API_KEY on the server; never put it in app.js.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 4000) return res.status(400).json({ error: 'Message must be 1–4000 characters.' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI is not configured.' });
  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        instructions: 'You are Miss Minutes, a friendly, playful, concise clock-themed personal assistant inspired by a fictional TVA mascot. Do not claim to access devices, timelines, private files, or perform actions you cannot actually perform. Be clear when a task requires the user to tap a control.',
        input: message,
        max_output_tokens: 450
      })
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(502).json({ error: 'AI provider request failed.' });
    const reply = (data.output || []).flatMap(item => item.content || []).filter(part => part.type === 'output_text').map(part => part.text).join('\n').trim();
    return res.status(200).json({ reply: reply || 'I could not create a response just now.' });
  } catch {
    return res.status(500).json({ error: 'Assistant service temporarily unavailable.' });
  }
}
