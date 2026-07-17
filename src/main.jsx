import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ReactGA from 'react-ga4'
import './index.css'
import ErrorBoundary from './ErrorBoundary'
import App from './App.jsx'
import { pingVisit } from './visitorCounter.js'

// Initialize Google Analytics with your Measurement ID
ReactGA.initialize("G-WJS1GK88NQ");
// Send an initial pageview
ReactGA.send({ hitType: "pageview", page: window.location.pathname, title: "Home Page" });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Silent once-per-day visitor ping — fires after paint, never blocks UI
pingVisit();