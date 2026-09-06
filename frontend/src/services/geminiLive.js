/**
 * Gemini 3.1 Flash Live — Real-time Audio Streaming Service
 *
 * Uses the Gemini Live API for native audio-in, audio-out streaming.
 * This avoids the latency of separate STT/TTS pipelines.
 */

const GEMINI_MODEL = 'gemini-3.1-flash-live-preview';

function buildSystemPrompt(config) {
  return `You are a professional AI interviewer conducting a mock job interview. Your persona is warm yet professional — think of a senior hiring manager who genuinely wants to help candidates succeed.

INTERVIEW CONTEXT:
- Target Company: ${config.company}
- Target Role: ${config.role}
- Candidate's Skills & Background: ${config.skills}

INTERVIEW RULES:
1. Start by warmly greeting the candidate and asking them to introduce themselves.
2. After the introduction, ask 3–5 targeted questions that are specific to the company and role.
3. Base follow-up questions on what the candidate says — listen actively and dig deeper.
4. Keep your responses concise (2–3 sentences max per turn) — this is a conversation, not a lecture.
5. Be encouraging but honest. If an answer is vague, gently probe for specifics.
6. After the questions, thank the candidate and end the interview naturally.
7. This is EVALUATION MODE only — do not provide feedback during the interview.

VOICE & TONE:
- Speak naturally and conversationally, as if in a real video call.
- Use brief acknowledgments like "Great," "I see," "That's interesting" to keep flow natural.
- Avoid overly formal or robotic phrasing.`;
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
    if (message.data) {
      // Handle audio data from the model
      const audioData = message.data;
      if (audioData) {
        this._playAudio(audioData);
      }
    }
    
    // Extract text from the model's response if available
    const parts = message.serverContent?.modelTurn?.parts;
    if (parts && Array.isArray(parts)) {
      const textParts = parts.filter(p => p.text).map(p => p.text).join(' ');
      if (textParts && textParts.trim().length > 0) {
        this.onTranscript?.('ai', textParts.trim());
      }
    }

    if (message.serverContent?.turnComplete) {
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
      source.connect(this.audioContext.destination);

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
