import { ipcMain, WebContents } from 'electron';
import { getApiKey } from './settings';
import { RealtimeTranscriber, TranscriberEvent } from '../services/RealtimeTranscriber';

let transcriber: RealtimeTranscriber | null = null;
let sink: WebContents | null = null;

export function closeTranscription(): void {
    transcriber?.removeAllListeners();
    transcriber?.stop();
    transcriber = null;
    sink = null;
}

export function registerTranscriptionHandlers(): void {
    // Renderer -> start listening
    ipcMain.handle('transcribe:start', (event, opts?: { language?: string; model?: string }) => {
        closeTranscription(); // never run two sessions at once

        sink = event.sender;
        transcriber = new RealtimeTranscriber(getApiKey, {
            language: opts?.language ?? 'en',
            model: opts?.model ?? 'gpt-realtime-whisper',
        });

        // Transcriber events -> renderer
        transcriber.on('event', (e: TranscriberEvent) => {
            if (sink && !sink.isDestroyed()) sink.send('transcribe:event', e);
        });

        transcriber.start();
        return true;
    });

    // Renderer -> audio frames (PCM16 ArrayBuffer)
    ipcMain.on('transcribe:audio', (event, buf: ArrayBuffer) => {
        if (!transcriber || event.sender !== sink) return;
        transcriber.sendAudio(Buffer.from(buf).toString('base64'));
    });

    // Renderer -> stop listening
    ipcMain.handle('transcribe:stop', () => {
        closeTranscription();
        return true;
    });
}