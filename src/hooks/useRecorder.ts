import { useRef, useState } from 'react';

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
];

export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Recording is not supported on this device.');
    }
    if (recording) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime =
      typeof MediaRecorder !== 'undefined'
        ? MIME_CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate))
        : undefined;
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);

    chunksRef.current = [];
    streamRef.current = stream;
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onerror = () => cleanup();
    recorder.start(250);
    setRecording(true);
  };

  const stop = (): Promise<Blob> =>
    new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) {
        cleanup();
        resolve(new Blob());
        return;
      }

      recorder.onstop = () => {
        const type = recorder.mimeType || chunksRef.current[0]?.type || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        cleanup();
        resolve(blob);
      };

      if (recorder.state === 'inactive') {
        cleanup();
        resolve(new Blob());
      } else {
        recorder.requestData();
        recorder.stop();
      }
    });

  return { recording, start, stop };
}

