
/*
  MISS MINUTES
  OFFLINE MODE
  No paid AI API requests.
*/

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      error: 'Offline mode is enabled. Paid API requests are disabled.'
    });
  }

  return res.status(410).json({
    offline: true,
    message: 'Miss Minutes is running in offline mode.',
    reply: 'Please use the offline assistant available in the website.'
  });
}
