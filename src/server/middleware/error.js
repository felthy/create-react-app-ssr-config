// NOTE: must keep the fourth parameter (`next`) in place to indicate to express that this is an error handler
module.exports = (err, req, res, next) => {
  console.error('Server Error:', err);

  const message = err ? err.message : 'Server error';
  const best = req.accepts(['application/json', 'text/html']);
  if (best && best === 'text/html') {
    res.status(500).send(message);
  } else {
    const response = {
      error: {
        message,
      },
    };
    if (err && process.env.NODE_ENV === 'development') {
      response.error.stack = err.stack;
    }
    res.status(500).json(response);
  }
}
