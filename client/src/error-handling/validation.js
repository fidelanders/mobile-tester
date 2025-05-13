// client/src/error-handling/validation.js
export const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateTestRequest = (url, device) => {
  const errors = [];
  
  if (!validateUrl(url)) {
    errors.push('Please enter a valid URL (e.g., https://example.com)');
  }
  
  if (!device) {
    errors.push('Please select a device');
  }
  
  return errors;
};