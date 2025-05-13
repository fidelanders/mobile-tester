// server/middleware/errorHandler.js
const logger = require('../server/utils/logger');

module.exports = (err, req, res, next) => {
  // Log the error
  logger.error(err.message, {
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    stack: err.stack
  });

  // Determine response based on environment
  const response = {
    success: false,
    message: 'An unexpected error occurred'
  };

  if (process.env.NODE_ENV === 'development') {
    response.error = err.message;
    response.stack = err.stack;
  }

  res.status(err.status || 500).json(response);
};