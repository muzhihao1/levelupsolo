import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    moduleType: 'ES Module context check',
    dirname: __dirname || 'undefined',
    filename: __filename || 'undefined',
    importMeta: {
      url: import.meta.url || 'undefined'
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasJWT: !!process.env.JWT_SECRET
    },
    tests: []
  };

  // Test different import styles
  const importTests = [
    { path: '../lib/auth-handlers', desc: 'without extension' },
    { path: '../lib/auth-handlers.js', desc: 'with .js extension' },
    { path: '../lib/auth-handlers.ts', desc: 'with .ts extension' }
  ];

  for (const test of importTests) {
    try {
      await import(test.path);
      diagnostics.tests.push({ ...test, result: 'success' });
    } catch (e: any) {
      diagnostics.tests.push({ 
        ...test, 
        result: 'failed', 
        error: e.message.substring(0, 100) 
      });
    }
  }

  return res.status(200).json(diagnostics);
}