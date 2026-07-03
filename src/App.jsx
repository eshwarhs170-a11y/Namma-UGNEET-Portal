import React from 'react';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="app-container" style={{ backgroundColor: '#fcfcfc', minHeight: '100vh' }}>
      {/* Rendering your brand new 15,040 record engine */}
      <Dashboard />
    </div>
  );
}

export default App;