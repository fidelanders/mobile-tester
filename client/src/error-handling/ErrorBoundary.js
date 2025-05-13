// client/src/error-handling/ErrorBoundary.js
import React from 'react';
import { logFrontendError } from './logging';

export class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service (Sentry, etc.)
  }

  // Add this to your ErrorBoundary's componentDidCatch
// componentDidCatch(error, errorInfo) {
//   if (process.env.NODE_ENV === 'production') {
//     // Initialize your error tracking service (Sentry, etc.)
//     import('@sentry/react').then((Sentry) => {
//       Sentry.captureException(error, { extra: errorInfo });
//     });
//   }
// }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

