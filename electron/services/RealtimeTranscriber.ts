import { EventEmitter } from 'events';
import WebSocket from 'ws';
const REALTIME_URL = 'wss://api.openai.com/v1/realtime?intent=transcription';
const MAX_PENDING_CHUNKS = 50; // ~5s of audio buffered while (re)connecting
const MAX_RECONNECTS = 5;
const SESSION_MODEL = 'gpt-realtime-mini';
export interface TranscriberConfig {
    language: string;
    model: string;
}

export type TranscriberStatus = 'connecting' | 'listening' | 'reconnecting';

export type TranscriberEvent =
    | { type: 'status'; status: TranscriberStatus }
    | { type: 'delta'; id: string; text: string }
    | { type: 'final'; id: string; text: string }
    | { type: 'error'; message: string; fatal: boolean };


export class RealtimeTranscriber extends EventEmitter {
    private ws: WebSocket | null = null;
    private active = false;
    private attempts = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private pending: string[] = [];
    private commitTimer: NodeJS.Timeout | null = null;
    private audioSinceCommit = false;
    constructor(
        private readonly getApiKey: () => string | undefined,
        private readonly config: TranscriberConfig,
    ) {
        super();
    }

    // ---------- Public API ----------

    start(): void {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            this.emitEvent({ type: 'error', message: 'API key not configured. Set it in Settings.', fatal: true });
            return;
        }
        this.active = true;
        this.attempts = 0;
        this.emitEvent({ type: 'status', status: 'connecting' });
        this.connect();
    }

    sendAudio(base64Audio: string): void {
        if (!this.active) return;
        this.audioSinceCommit = true;

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: base64Audio }));
        } else {
            this.pending.push(base64Audio);
            if (this.pending.length > MAX_PENDING_CHUNKS) this.pending.shift();
        }
    }

    stop(): void {
        this.active = false;
        this.clearReconnectTimer();
        this.clearCommitTimer();
        this.pending = [];

        if (this.ws) {
            const socket = this.ws;
            this.ws = null;
            socket.removeAllListeners();
            socket.on('error', () => { });
            socket.close();
        }
    }
    private connect(): void {
        const apiKey = this.getApiKey();
        if (!apiKey) return this.fail('API key not configured. Set it in Settings.');

        const socket = new WebSocket(REALTIME_URL, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
        this.ws = socket;

        socket.on('open', () => this.onOpen(socket));
        socket.on('message', (raw) => this.onMessage(raw));
        socket.on('error', (err) => this.onError(err));
        socket.on('close', () => this.onClose(socket));
    }

    private onOpen(socket: WebSocket): void {
        this.attempts = 0;
        socket.send(
            JSON.stringify({
                type: 'session.update',
                session: {
                    type: 'transcription',
                    audio: {
                        input: {
                            format: { type: 'audio/pcm', rate: 24000 },
                            transcription: {
                                model: this.config.model,
                                language: this.config.language,
                            },
                        },
                    },
                },
            }),
        );

        for (const audio of this.pending) {
            socket.send(JSON.stringify({ type: 'input_audio_buffer.append', audio }));
        }
        this.pending = [];

        this.startCommitTimer(socket);
        this.emitEvent({ type: 'status', status: 'listening' });
    }

    private startCommitTimer(socket: WebSocket): void {
        this.clearCommitTimer();
        this.commitTimer = setInterval(() => {
            if (socket.readyState !== WebSocket.OPEN) return;
            if (!this.audioSinceCommit) return; // nothing new — skip an empty commit
            this.audioSinceCommit = false;
            socket.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
        }, 3000); // finalize whatever's been said every 3s
    }

    private clearCommitTimer(): void {
        if (this.commitTimer) clearInterval(this.commitTimer);
        this.commitTimer = null;
    }

    private onMessage(raw: WebSocket.RawData): void {
        let msg: any;
        try {
            msg = JSON.parse(raw.toString());
        } catch {
            return;
        }

        switch (msg.type) {
            case 'conversation.item.input_audio_transcription.delta':
                this.emitEvent({ type: 'delta', id: msg.item_id, text: msg.delta ?? '' });
                break;
            case 'conversation.item.input_audio_transcription.completed':
                this.emitEvent({ type: 'final', id: msg.item_id, text: msg.transcript ?? '' });
                break;
            case 'error':
                console.error('[Transcriber] API error:', msg.error);
                this.emitEvent({ type: 'error', message: msg.error?.message ?? 'Transcription error', fatal: false });
                break;
            default:
                console.log('[Transcriber] event:', msg.type);
        }
    }

    private onError(err: Error): void {
        if (!this.active) return; // intentionally stopped — ignore teardown noise
        console.error('[Transcriber] socket error:', err.message);
        if (err.message.includes('401')) this.fail('Invalid API key.');
    }

    private onClose(socket: WebSocket): void {
        if (this.ws !== socket) return; // closed on purpose or replaced
        this.ws = null;
        this.scheduleReconnect(); // handles network drops and session time limits
    }

    // ---------- Reconnect / failure ----------

    private scheduleReconnect(): void {
        if (!this.active) return;

        this.attempts += 1;
        if (this.attempts > MAX_RECONNECTS) {
            return this.fail('Connection lost. Please start listening again.');
        }

        this.emitEvent({ type: 'status', status: 'reconnecting' });
        const delay = Math.min(1000 * 2 ** this.attempts, 8000);
        this.reconnectTimer = setTimeout(() => this.connect(), delay);
    }

    private fail(message: string): void {
        this.emitEvent({ type: 'error', message, fatal: true });
        this.stop();
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
    }

    private emitEvent(event: TranscriberEvent): void {
        this.emit('event', event);
    }
}