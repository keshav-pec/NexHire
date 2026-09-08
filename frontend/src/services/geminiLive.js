/**
 * Gemini 3.1 Flash Live — Real-time Audio Streaming Service
 *
 * Uses the Gemini Live API for native audio-in, audio-out streaming.
 * This avoids the latency of separate STT/TTS pipelines.
 */

const GEMINI_MODEL = 'gemini-3.1-flash-live-preview';

function buildSystemPrompt(config) {
  return `You are a warm, professional AI interviewer for ${config.company}. You are interviewing the candidate for the following role: ${config.role}.
Candidate's Skills: ${config.skills}.

INTERVIEW RULES:
1. Greet the candidate and ask for a brief introduction.
2. Ask 3-5 targeted questions specific to the role. Listen actively and ask follow-up questions.
3. Keep your responses concise (max 2-3 sentences). This is a conversation.
4. This is EVALUATION MODE. Do NOT provide feedback during the interview.
5. Once all questions are asked, thank the candidate and end naturally.

Speak naturally and conversationally.`;
}

export class GeminiLiveService {
  constructor() {
    this.session = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.stream = null;
    this.onAudioData = null;
    this.onTranscript = null;
    this.onStateChange = null;
    this.onError = null;
    this.isConnected = false;
    this._playbackQueue = [];
    this._isPlaying = false;
    this._isSpeaking = false;
    this._volumeLevel = 0;
    this._nextPlayTime = 0;
    this.onVolumeChange = null;
    this._currentAiText = '';
    this._aiMuted = false;
  }

  setAiMuted(muted) {
    this._aiMuted = muted;
  }

  async connect(apiKey, config) {
    try {
      this._notifyState('connecting');

      const { GoogleGenAI, Modality } = await import('@google/genai');
      this._Modality = Modality;

      const ai = new GoogleGenAI({ apiKey });

      this.session = await ai.live.connect({
        model: GEMINI_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: {
            parts: [{ text: buildSystemPrompt(config) }],
          },
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Charon',
              },
            },
          },
        },
        callbacks: {
          onopen: () => {
            this.isConnected = true;
            this._notifyState('connected');
          },
          onmessage: (message) => {
            this._handleMessage(message);
          },
          onerror: (error) => {
            console.error('Gemini Live error:', error);
            this.onError?.('Connection error occurred');
            this._notifyState('error');
          },
          onclose: () => {
            this.isConnected = false;
            this._notifyState('disconnected');
          },
        },
      });

      // Set up audio context for playback
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000,
      });

      return true;
    } catch (error) {
      console.error('Failed to connect to Gemini Live:', error);
      this.onError?.(error.message || 'Failed to connect');
      this._notifyState('error');
      return false;
    }
  }

  async startMicrophone() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const micContext = new AudioContext({ sampleRate: 16000 });
      this.sourceNode = micContext.createMediaStreamSource(this.stream);

      this.processorNode = micContext.createScriptProcessor(4096, 1, 1);
      this.processorNode.onaudioprocess = (event) => {
        if (!this.isConnected || !this.session) return;

        const inputData = event.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(inputData[i] * 32767)));
        }

        const base64 = this._arrayBufferToBase64(pcm16.buffer);
        this.session.sendRealtimeInput({
          audio: {
            data: base64,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(micContext.destination);

      this._notifyState('listening');
      return true;
    } catch (error) {
      console.error('Microphone access failed:', error);
      this.onError?.('Microphone access denied');
      return false;
    }
  }

  _handleMessage(message) {
    let audioPlayed = false;

    if (message.data) {
      this._playAudio(message.data);
      audioPlayed = true;
    }

    // Extract text and audio from the model's response if available
    const parts = message.serverContent?.modelTurn?.parts;
    if (parts && Array.isArray(parts)) {
      for (const part of parts) {
        if (part.text) {
          this._currentAiText = (this._currentAiText || '') + part.text;
          this.onLiveCaption?.('ai', this._currentAiText);
        }
        if (!audioPlayed && part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
          this._playAudio(part.inlineData.data);
        }
      }
    }

    if (message.serverContent?.turnComplete) {
      if (this._currentAiText && this._currentAiText.trim().length > 0) {
        this.onTranscript?.('ai', this._currentAiText.trim());
      }
      this._currentAiText = '';
      this.onLiveCaption?.('ai', '');
      this._isSpeaking = false;
      this._volumeLevel = 0;
      this._nextPlayTime = 0;
      this.onVolumeChange?.(0);
      this._notifyState('listening');
    }
  }

  async _playAudio(base64Audio) {
    if (!this.audioContext) return;

    try {
      this._isSpeaking = true;
      this._notifyState('speaking');

      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to Float32 for Web Audio API
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      // Calculate volume for lip sync
      let sum = 0;
      for (let i = 0; i < float32.length; i++) {
        sum += float32[i] * float32[i];
      }
      const rms = Math.sqrt(sum / float32.length);
      this._volumeLevel = Math.min(1, rms * 3);
      this.onVolumeChange?.(this._volumeLevel);

      // Create audio buffer
      const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      if (!this._aiMuted) {
        source.connect(this.audioContext.destination);
      }

      // Schedule sequentially — each chunk plays AFTER the previous one
      const now = this.audioContext.currentTime;
      const startAt = Math.max(now, this._nextPlayTime);
      source.start(startAt);

      // Update the cursor so the next chunk starts when this one ends
      this._nextPlayTime = startAt + audioBuffer.duration;

    } catch (error) {
      console.error('Audio playback error:', error);
    }
  }

  _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  _notifyState(state) {
    this.onStateChange?.(state);
  }

  setMuted(muted) {
    if (this.stream) {
      this.stream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  async disconnect() {
    try {
      if (this.processorNode) {
        this.processorNode.disconnect();
        this.processorNode = null;
      }
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      if (this.session) {
        this.session.close?.();
        this.session = null;
      }
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }
      this.isConnected = false;
      this._isSpeaking = false;
      this._volumeLevel = 0;
      this._nextPlayTime = 0;
      this._notifyState('disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  get isSpeaking() {
    return this._isSpeaking;
  }

  get volumeLevel() {
    return this._volumeLevel;
  }
}

// Singleton instance
let instance = null;

export function getGeminiService() {
  if (!instance) {
    instance = new GeminiLiveService();
  }
  return instance;
}

export function resetGeminiService() {
  if (instance) {
    instance.disconnect();
    instance = null;
  }
}
