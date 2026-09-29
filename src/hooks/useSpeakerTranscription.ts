import { useRef, useState, useCallback, useEffect } from 'react';

export type ListenStatus = 'idle' | 'connecting' | 'listening' | 'reconnecting' | 'error';

// Converts audio to 24kHz mono PCM16 in 100ms frames (what the API expects)
const WORKLET = `
class PcmProcessor extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Int16Array(2400); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      this.buf[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.n === this.buf.length) {
        this.port.postMessage(this.buf.buffer.slice(0));
        this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-processor', PcmProcessor);
`;

// Safety net: drop output in the wrong script (e.g. Arabic text when expecting English)
function isWrongScript(text: string, lang: string) {
    if (!lang.toLowerCase().startsWith('en')) return false;
    const letters = text.match(/\p{L}/gu) ?? [];
    if (!letters.length) return false;
    const nonLatin = letters.filter((c) => !/\p{Script=Latin}/u.test(c)).length;
    return nonLatin / letters.length > 0.3;
}

interface Options {
    language?: string;
    onFinal: (text: string) => void;
}

export function useSpeakerTranscription({ language = 'en', onFinal }: Options) {
    const [status, setStatus] = useState<ListenStatus>('idle');
    const [partial, setPartial] = useState('');
    const [error, setError] = useState<string | null>(null);

    const api = (window as any).electronAPI;
    const ctxRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const unsubRef = useRef<(() => void) | null>(null);
    const partsRef = useRef(new Map<string, string>());
    const onFinalRef = useRef(onFinal);
    onFinalRef.current = onFinal;

    // Ref mirrors `status` so callbacks always read the latest value (Bug 6 fix)
    const statusRef = useRef<ListenStatus>('idle');
    useEffect(() => { statusRef.current = status; }, [status]);

    // Track the ended-event handler so we can remove it in stop() (Bug 5 fix)
    const endedHandlerRef = useRef<(() => void) | null>(null);

    const stop = useCallback(() => {
        unsubRef.current?.();
        unsubRef.current = null;

        // Remove the ended listener before stopping tracks (Bug 5 fix)
        if (streamRef.current && endedHandlerRef.current) {
            streamRef.current.getAudioTracks().forEach((t) =>
                t.removeEventListener('ended', endedHandlerRef.current!),
            );
        }
        endedHandlerRef.current = null;

        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        ctxRef.current?.close().catch(() => { });
        ctxRef.current = null;
        partsRef.current.clear();
        setPartial('');
        setStatus('idle');
        api.stopTranscription();
    }, [api]);

    const start = useCallback(async () => {
        // Guard uses ref so we never read a stale closure value (Bug 6 fix)
        const current = statusRef.current;
        if (current === 'connecting' || current === 'listening' || current === 'reconnecting') return;
        setError(null);
        setStatus('connecting');

        try {
            // Try system audio first (captures other person's voice from speakers),
            // fall back to microphone if system audio capture fails or is denied.
            let stream: MediaStream;
            try {
                const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                display.getVideoTracks().forEach((t) => t.stop()); // only need audio
                const audioTracks = display.getAudioTracks();
                if (!audioTracks.length) throw new Error('no-audio');
                stream = new MediaStream(audioTracks);
            } catch {
                // System audio unavailable — fall back to microphone
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            const tracks = stream.getAudioTracks();
            if (!tracks.length) throw new Error('No audio source available. Check microphone permissions.');

            streamRef.current = stream;

            // Store handler ref so stop() can remove it (Bug 5 fix)
            endedHandlerRef.current = stop;
            tracks[0].addEventListener('ended', stop);

            unsubRef.current = api.onTranscription((e: any) => {
                switch (e.type) {
                    case 'status':
                        setStatus(e.status);
                        break;
                    case 'delta': {
                        partsRef.current.set(e.id, (partsRef.current.get(e.id) ?? '') + e.text);
                        setPartial([...partsRef.current.values()].join(' ').trim());
                        break;
                    }
                    case 'final': {
                        partsRef.current.delete(e.id);
                        setPartial([...partsRef.current.values()].join(' ').trim());
                        const text = String(e.text ?? '').trim();
                        if (text && !isWrongScript(text, language)) onFinalRef.current(text);
                        break;
                    }
                    case 'error':
                        setError(e.message);
                        if (e.fatal) stop();
                        break;
                }
            });

            await api.startTranscription({ language });

            const ctx = new AudioContext({ sampleRate: 24000 });
            ctxRef.current = ctx;
            const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
            await ctx.audioWorklet.addModule(url);
            URL.revokeObjectURL(url);
            await ctx.resume();

            const source = ctx.createMediaStreamSource(stream);
            const node = new AudioWorkletNode(ctx, 'pcm-processor', {
                channelCount: 1,
                channelCountMode: 'explicit',
                numberOfOutputs: 0,
            });
            node.port.onmessage = (ev) => api.sendAudio(ev.data);
            source.connect(node);
        } catch (e) {
            setError((e as Error).message || 'Could not start listening.');
            stop();
            setStatus('error');
        }
    }, [api, language, stop]);

    useEffect(() => stop, [stop]); // clean up on unmount

    return { status, partial, error, start, stop };
}