// client/src/error-handling/errorMessages.js
const messages = {
  400: 'Invalid request. Please check your input.',
  401: 'Please login to access this feature.',
  404: 'The requested resource was not found.',
  500: 'Server error. Our team has been notified.',
  network: 'Network connection failed. Please check your internet.',
  default: 'Something went wrong. Please try again.'
};

export const getErrorMessage = (code, details) => {
  return details || messages[code] || messages.default;
};