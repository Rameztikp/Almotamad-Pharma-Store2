import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>حدث خطأ غير متوقع</h2>
          <p>نعتذر عن هذا الخطأ. يرجى إعادة تحميل الصفحة.</p>
          <button onClick={() => window.location.reload()}>
            إعادة تحميل
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;