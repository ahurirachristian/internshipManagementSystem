import './App.css';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    window.location.replace('/login.html');
  }, []);

  return (
    <div className="app-shell">
      <div className="welcome-card">
        <h1>Redirecting to the original login screen...</h1>
        <p>If you are not redirected automatically, click the button below.</p>
        <a className="page-button" href="/login.html">
          Open Login Page
        </a>
      </div>
    </div>
  );
}

export default App;
