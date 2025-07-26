import { useState, useCallback } from 'react';
import { SceneState, TokenResponse, TokenResponseSchema } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

// Audio playback management
let globalAudioContext: AudioContext | null = null;

export const useImprovScene = () => {
  const [sceneState, setSceneState] = useState<SceneState>({
    status: 'idle',
    isListening: false,
    transcript: '',
  });

  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const fetchToken = async (): Promise<TokenResponse> => {
    const response = await fetch(`${API_BASE_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.statusText}`);
    }

    const data = await response.json();
    return TokenResponseSchema.parse(data);
  };

  const setupWebSocketConnection = async (token: string): Promise<WebSocket> => {
    const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`, [
      'realtime',
      `openai-insecure-api-key.${token}`,
      `openai-beta.realtime-v1`
    ]);

    ws.onopen = () => {
      console.log('WebSocket connected to OpenAI');
      setSceneState((prev: SceneState) => ({ ...prev, status: 'active', isListening: true }));
      
      // Send session configuration
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          instructions: 'You are an improv comedy partner. Follow "Yes, and..." rules. Keep responses under 8 seconds. Be witty and engaging in your character work.',
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          }
        }
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message:', data);
      
      if (data.type === 'response.audio.delta' && data.delta) {
        // Convert base64 audio to playable format
        try {
          const audioData = atob(data.delta);
          const audioArray = new Int16Array(audioData.length / 2);
          
          // Convert the string to Int16Array (PCM16)
          for (let i = 0; i < audioArray.length; i++) {
            const byte1 = audioData.charCodeAt(i * 2);
            const byte2 = audioData.charCodeAt(i * 2 + 1);
            audioArray[i] = (byte2 << 8) | byte1; // Little-endian
          }
          
          // Use global audio context for consistent access
          if (globalAudioContext && globalAudioContext.state !== 'closed') {
            const audioBuffer = globalAudioContext.createBuffer(1, audioArray.length, 24000);
            const channelData = audioBuffer.getChannelData(0);
            
            // Convert Int16 to Float32 and normalize
            for (let i = 0; i < audioArray.length; i++) {
              channelData[i] = audioArray[i] / 32768.0;
            }
            
            const source = globalAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(globalAudioContext.destination);
            source.start();
          }
        } catch (error) {
          console.error('Error playing audio:', error);
        }
      }
      
      if (data.type === 'response.text.delta') {
        setSceneState((prev: SceneState) => ({ 
          ...prev, 
          transcript: prev.transcript + (data.delta || '')
        }));
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setSceneState((prev: SceneState) => ({ 
        ...prev, 
        status: 'error', 
        error: 'Connection failed' 
      }));
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      setSceneState((prev: SceneState) => ({ ...prev, status: 'idle', isListening: false }));
    };

    return ws;
  };

  const setupAudioStreaming = async (ws: WebSocket, stream: MediaStream) => {
    try {
      // Initialize audio context for both input and output
      const context = new AudioContext({ sampleRate: 24000 });
      
      // Resume audio context if suspended (required by browser policies)
      if (context.state === 'suspended') {
        await context.resume();
      }
      
      // Store context globally and in state
      globalAudioContext = context;
      setAudioContext(context);
      
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        
        const inputData = event.inputBuffer.getChannelData(0);
        const outputData = new Int16Array(inputData.length);
        
        // Convert Float32 to Int16 (PCM16)
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          outputData[i] = sample * 32767;
        }
        
        // Convert to base64 and send to OpenAI
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(outputData.buffer)));
        
        ws.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64Audio
        }));
      };
      
      source.connect(processor);
      processor.connect(context.destination);
      
      console.log('Audio streaming setup complete');
    } catch (error) {
      console.error('Error setting up audio streaming:', error);
      throw error;
    }
  };

  const startScene = useCallback(async () => {
    try {
      setSceneState((prev: SceneState) => ({ ...prev, status: 'connecting', error: undefined }));

      // Create and activate audio context early (user gesture required)
      if (!globalAudioContext || globalAudioContext.state === 'closed') {
        const tempContext = new AudioContext({ sampleRate: 24000 });
        if (tempContext.state === 'suspended') {
          await tempContext.resume();
        }
        globalAudioContext = tempContext;
      }

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
          channelCount: 1,
        },
      });
      setMediaStream(stream);

      // Fetch token from backend
      const tokenData = await fetchToken();

      // Setup WebSocket connection to OpenAI
      const ws = await setupWebSocketConnection(tokenData.token);
      setWebsocket(ws);

      // Setup audio streaming
      await setupAudioStreaming(ws, stream);

    } catch (error) {
      console.error('Failed to start scene:', error);
      setSceneState((prev: SceneState) => ({ 
        ...prev, 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }));
    }
  }, []);

  const stopScene = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setMediaStream(null);
    }

    if (websocket) {
      websocket.close();
      setWebsocket(null);
    }

    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }

    if (globalAudioContext) {
      globalAudioContext.close();
      globalAudioContext = null;
    }

    setSceneState({
      status: 'idle',
      isListening: false,
      transcript: '',
    });
  }, [mediaStream, websocket, audioContext]);

  return {
    sceneState,
    startScene,
    stopScene,
  };
};
