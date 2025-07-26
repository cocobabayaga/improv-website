import React from 'react';
import { useImprovScene } from '../hooks/useImprovScene';
import './SceneControls.css';

export const SceneControls: React.FC = () => {
  const { sceneState, startScene, stopScene } = useImprovScene();

  const getStatusDisplay = () => {
    switch (sceneState.status) {
      case 'idle':
        return 'Ready to start';
      case 'connecting':
        return 'Connecting to AI partner...';
      case 'active':
        return sceneState.isListening ? 'Scene in progress - AI is listening' : 'Scene in progress';
      case 'error':
        return `Error: ${sceneState.error}`;
      default:
        return 'Unknown status';
    }
  };

  const getButtonText = () => {
    switch (sceneState.status) {
      case 'idle':
        return 'Start Scene';
      case 'connecting':
        return 'Connecting...';
      case 'active':
        return 'Stop Scene';
      case 'error':
        return 'Try Again';
      default:
        return 'Start Scene';
    }
  };

  const handleButtonClick = () => {
    if (sceneState.status === 'active') {
      stopScene();
    } else {
      startScene();
    }
  };

  const isButtonDisabled = sceneState.status === 'connecting';

  return (
    <div className="scene-controls">
      <div className="status-indicator">
        <div className={`status-light ${sceneState.status}`}></div>
        <span className="status-text">{getStatusDisplay()}</span>
      </div>
      
      <button
        className={`scene-button ${sceneState.status}`}
        onClick={handleButtonClick}
        disabled={isButtonDisabled}
      >
        {getButtonText()}
      </button>

      {sceneState.status === 'active' && (
        <div className="scene-indicators">
          <div className={`mic-indicator ${sceneState.isListening ? 'active' : ''}`}>
            🎤
          </div>
          <div className="ai-indicator">
            🤖 AI Partner
          </div>
        </div>
      )}

      {sceneState.transcript && (
        <div className="transcript">
          <h3>Scene Transcript</h3>
          <div className="transcript-content">
            {sceneState.transcript}
          </div>
        </div>
      )}

      {/* Hidden audio element for remote stream */}
      <audio id="remote-audio" autoPlay style={{ display: 'none' }}></audio>
    </div>
  );
};
