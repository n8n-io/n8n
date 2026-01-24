import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { formatErrorForDisplay } from '../errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * General ErrorBoundary component
 * Catches and displays errors in child components
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Store error info in state
    this.setState({
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // In production, this would send to error tracking service
    // Example: sendToErrorTracking(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      const { title, message, details } = formatErrorForDisplay(
        this.state.error
      );
      const componentName = this.props.componentName || 'Component';

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="max-w-lg w-full bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-red-900 mb-2">
                  {title}
                </h2>
                <p className="text-sm text-red-800 mb-3">{message}</p>

                {details && (
                  <details className="mb-4">
                    <summary className="text-sm font-medium text-red-900 cursor-pointer hover:text-red-700">
                      Error Details
                    </summary>
                    <pre className="mt-2 text-xs text-red-800 bg-red-100 p-3 rounded overflow-auto max-h-40">
                      {details}
                    </pre>
                  </details>
                )}

                {import.meta.env.DEV && this.state.errorInfo && (
                  <details className="mb-4">
                    <summary className="text-sm font-medium text-red-900 cursor-pointer hover:text-red-700">
                      Stack Trace (Development Only)
                    </summary>
                    <pre className="mt-2 text-xs text-red-800 bg-red-100 p-3 rounded overflow-auto max-h-60">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}

                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  aria-label={`Reset ${componentName}`}
                >
                  <RefreshCw size={16} />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Canvas-specific ErrorBoundary
 */
export function CanvasErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      componentName="Workflow Canvas"
      onError={(error, errorInfo) => {
        console.error('Canvas error:', error, errorInfo);
        // In production: track canvas-specific errors
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Dashboard-specific ErrorBoundary
 */
export function DashboardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      componentName="Dashboard"
      onError={(error, errorInfo) => {
        console.error('Dashboard error:', error, errorInfo);
        // In production: track dashboard-specific errors
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * NodePalette-specific ErrorBoundary
 */
export function NodePaletteErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      componentName="Node Palette"
      onError={(error, errorInfo) => {
        console.error('NodePalette error:', error, errorInfo);
        // In production: track palette-specific errors
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
