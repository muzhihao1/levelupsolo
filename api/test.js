module.exports = (req, res) => {
  res.status(200).json({
    message: 'JavaScript endpoint works',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
};