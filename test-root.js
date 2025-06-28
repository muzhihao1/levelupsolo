module.exports = (req, res) => {
  res.status(200).json({
    message: 'Root level function works',
    timestamp: new Date().toISOString()
  });
};
EOF < /dev/null