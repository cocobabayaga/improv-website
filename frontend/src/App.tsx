// import React from 'react';
import { SceneControls } from './components/SceneControls';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="header">
        <h1>🎭 Improv Comedy Voice App</h1>
        <p>Start an improvisational comedy scene with your AI scene partner!</p>
      </header>

      <main className="main">
        <SceneControls />
      </main>

      <footer className="footer">
        <p>Powered by OpenAI Realtime API</p>
      </footer>
    </div>
  );
}

export default App;
