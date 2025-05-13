// client/src/error-handling/apiErrorHandler.js
import { getErrorMessage } from './errorMessages';
import { logApiError } from './logging';

export const handleApiError = (error) => {
  logApiError(error);
  
  if (error.code === 'ERR_NETWORK') {
    return getErrorMessage('network');
  }
  
  return getErrorMessage(
    error.response?.status || 'default',
    error.response?.data?.details
  );
};