export default async function handler(req, res) {
  const results = {};
  
  // Test different imports
  try {
    const express = await import('express');
    results.express = 'success';
  } catch (e) {
    results.express = e.message;
  }
  
  try {
    const routes = await import('../server/routes.js');
    results.serverRoutes = 'success';
  } catch (e) {
    results.serverRoutes = e.message;
  }
  
  try {
    const storage = await import('../server/storage.js');
    results.serverStorage = 'success';
  } catch (e) {
    results.serverStorage = e.message;
  }
  
  res.status(200).json({
    imports: results,
    dirname: __dirname,
    cwd: process.cwd()
  });
}