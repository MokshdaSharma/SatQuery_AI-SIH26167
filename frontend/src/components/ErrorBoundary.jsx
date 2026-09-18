/**
 * ErrorBoundary.jsx — React error boundary with styled crash recovery UI.
 *
 * Wraps the entire app to catch unhandled rendering errors and display
 * a graceful recovery screen instead of a white page.
 */

import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__icon">🛰️</div>
          <h1 className="error-boundary__title">Something went wrong</h1>
          <p className="error-boundary__message">
            SatQuery AI encountered an unexpected error. This is usually temporary.
            Try reloading the page or resetting the application state.
          </p>
          {this.state.error && (
            <pre style={{
              fontSize: 11,
              color: "var(--color-text-muted)",
              background: "rgba(248,113,113,0.05)",
              border: "1px solid rgba(248,113,113,0.15)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
              maxWidth: 500,
              overflow: "auto",
              maxHeight: 120,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {this.state.error.toString()}
            </pre>
          )}
          <div className="error-boundary__actions">
            <button className="btn btn-primary" onClick={this.handleReload} style={{ width: "auto", padding: "10px 24px" }}>
              🔄 Reload Page
            </button>
            <button className="btn btn-secondary" onClick={this.handleReset}>
              ↩ Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
