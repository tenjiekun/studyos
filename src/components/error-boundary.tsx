"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("StudyOS Error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#050510] p-6">
          <div className="w-full max-w-md text-center space-y-6">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/15 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-white/90 tracking-tight">
                Something went wrong
              </h1>
              <p className="text-sm text-white/40 leading-relaxed">
                StudyOS encountered an unexpected error.
                <br />
                This might be a temporary issue — try refreshing the page.
              </p>
            </div>

            {/* Error details (collapsed) */}
            {this.state.error && (
              <details className="text-left">
                <summary className="text-xs text-white/25 cursor-pointer hover:text-white/40 transition-colors">
                  Error details
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] text-red-300/60 overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            {/* Retry button */}
            <button
              onClick={this.handleRetry}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-medium flex items-center justify-center gap-2 mx-auto shadow-[0_0_25px_rgba(99,102,241,0.2)] hover:shadow-[0_0_35px_rgba(99,102,241,0.3)] hover:from-indigo-400 hover:to-indigo-500 transition-all duration-300 active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>

            <p className="text-[10px] text-white/20">
              If this keeps happening, try clearing your browser cache.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
