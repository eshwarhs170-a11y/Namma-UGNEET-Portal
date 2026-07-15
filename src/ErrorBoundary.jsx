import React from 'react';
import { 
  Search, Target, Info, AlertTriangle, Lock, Unlock, ScrollText, Mail, 
  Star, Trash2, FileText, MessageCircle, School, User, PenTool, Lightbulb, 
  Coffee, RefreshCw, Frown, Circle, BarChart3, Check, X
} from 'lucide-react';


// Catches any rendering error in the component tree below it and shows a
// friendly fallback instead of a blank white screen. Wrap your top-level
// <App /> (or <Dashboard />) with this in main.jsx — see instructions.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Logs to the browser console so you can still debug in production.
    // Swap this for a real error-tracking service (e.g. Sentry) later if you want.
    console.error('NammaUGNEET crashed:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            background: '#fbfaf6',
            color: '#1b2a4a',
            fontFamily: '-apple-system, sans-serif',
            textAlign: 'center',
            padding: '24px',
          }}
        >
          <h2 style={{ margin: 0 }}><Frown className="lucide-icon" size={24} /> Something went wrong</h2>
          <p style={{ maxWidth: '360px', color: '#5b6472', margin: 0 }}>
            NammaUGNEET hit an unexpected error. Your saved colleges and profiles are safe —
            just refresh to try again.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 20px',
              borderRadius: '7px',
              border: 'none',
              background: '#1b2a4a',
              color: '#fbfaf6',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}