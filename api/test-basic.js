export default function handler(req, res) {
  try {
    // Test basic functionality
    const diagnostics = {
      method: req.method,
      url: req.url,
      headers: req.headers.host,
      env: {
        hasDatabase: !!process.env.DATABASE_URL,
        hasJWT: !!process.env.JWT_SECRET,
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        nodeVersion: process.version
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json(diagnostics);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}