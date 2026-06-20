// apps/web/src/components/shared/ErrorBoundary.tsx
// React error boundary — catches render errors, reports them, shows fallback UI.

'use client';

import { Component, ReactNode } from 'react';
import { reportError } from '@/lib/monitoring';

interface Props {
  children:   ReactNode;
  fallback?:  ReactNode;
  context?:   string;
}

interface State {
  hasError:   boolean;
  errorId?:   string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true, errorId: `err_${Date.now().toString(36)}` };
  }

  componentDidCatch(error: Error) {
    reportError(error, this.props.context ?? 'ErrorBoundary');
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            This section failed to load. Please refresh the page.
          </p>
          {this.state.errorId && (
            <p className="text-xs text-gray-400">Error ID: {this.state.errorId}</p>
          )}
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
