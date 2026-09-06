/**
 * GET /api/gemini/key  (protected)
 *
 * Returns the Gemini API key to authenticated clients so the key is never
 * embedded in the frontend bundle. The key lives only in the backend .env.
 */
const getGeminiKey = (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return res.status(503).json({
      success: false,
      message: 'Gemini API key not configured on the server',
    });
  }

  return res.status(200).json({ success: true, apiKey });
};

module.exports = { getGeminiKey };
