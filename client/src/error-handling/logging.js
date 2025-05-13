// client/src/error-handling/logging.js
export const logFrontendError = (error, errorInfo) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('Client Error:', error, errorInfo);
  }
  // TODO: Add Sentry/LogRocket integration
};

export const logApiError = (error) => {
  const logData = {
    url: error.config?.url,
    status: error.response?.status,
    message: error.message,
    timestamp: new Date().toISOString()
  };
  console.error('API Error:', logData);
};