import React from 'react';

class ErrorBoundary extends React.Component<{ children: React.ReactNode, fallback?: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode, fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-full w-full bg-gray-100 text-red-500 p-4 border border-red-300 rounded">
          <p>Something went wrong loading the 3D scene.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
