import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ErrorBoundary from './ErrorBoundary'
import App from './App.jsx'
import { pingVisit } from './visitorCounter.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Silent once-per-day visitor ping — fires after paint, never blocks UI
pingVisit();