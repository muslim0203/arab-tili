// ─────────────────────────────────────────────────
// Audio Recorder – MediaRecorder API wrapper
// Live waveform visualization, auto-stop on timer
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { getRemainingSeconds } from "@/utils/timer";

interface AudioRecorderProps {
    deadline: number;
    onComplete: (blob: Blob) => void;
}

type RecordingState = "starting" | "recording" | "stopping" | "done";

export function AudioRecorder({ deadline, onComplete }: AudioRecorderProps) {
    const [state, setState] = useState<RecordingState>("starting");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animFrameRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const completeCalledRef = useRef(false);

    // Start recording on mount
    useEffect(() => {
        let cancelled = false;

        async function start() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 44100,
                    },
                });

                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }

                streamRef.current = stream;

                // Set up analyser for waveform
                const audioCtx = new AudioContext();
                const source = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                analyserRef.current = analyser;

                // MediaRecorder
                const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                    ? "audio/webm;codecs=opus"
                    : "audio/webm";

                const mr = new MediaRecorder(stream, { mimeType });
                mediaRecorderRef.current = mr;
                chunksRef.current = [];

                mr.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
                };

                mr.onstop = () => {
                    stream.getTracks().forEach((t) => t.stop());
                    audioCtx.close();
                    const blob = new Blob(chunksRef.current, { type: mimeType });
                    if (!completeCalledRef.current) {
                        completeCalledRef.current = true;
                        setState("done");
                        onComplete(blob);
                    }
                };

                mr.start(1000); // collect chunks every second
                setState("recording");

                // Start waveform animation
                drawWaveform(analyser);
            } catch {
                // mic error — fallback: send empty blob
                if (!completeCalledRef.current) {
                    completeCalledRef.current = true;
                    setState("done");
                    onComplete(new Blob([], { type: "audio/webm" }));
                }
            }
        }

        start();

        return () => {
            cancelled = true;
            cancelAnimationFrame(animFrameRef.current);
            if (mediaRecorderRef.current?.state === "recording") {
                mediaRecorderRef.current.stop();
            }
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Monitor deadline
    useEffect(() => {
        if (state !== "recording") return;
        const interval = setInterval(() => {
            if (getRemainingSeconds(deadline) <= 0) {
                stopRecording();
                clearInterval(interval);
            }
        }, 500);
        return () => clearInterval(interval);
    }, [deadline, state]); // eslint-disable-line react-hooks/exhaustive-deps

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === "recording") {
            setState("stopping");
            mediaRecorderRef.current.stop();
        }
    }, []);

    // Waveform drawing
    const drawWaveform = useCallback((analyser: AnalyserNode) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function draw() {
            if (!canvas || !ctx) return;
            animFrameRef.current = requestAnimationFrame(draw);

            analyser.getByteFrequencyData(dataArray);

            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            const barWidth = (w / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * h;

                // Gradient from rose to orange
                const ratio = i / bufferLength;
                const r = Math.floor(244 * (1 - ratio) + 249 * ratio);
                const g = Math.floor(63 * (1 - ratio) + 115 * ratio);
                const b = Math.floor(94 * (1 - ratio) + 22 * ratio);
                ctx.fillStyle = `rgba(${r},${g},${b},0.8)`;

                const y = (h - barHeight) / 2;
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth - 1, barHeight, 2);
                ctx.fill();

                x += barWidth;
            }
        }

        draw();
    }, []);

    return (
        <div className="rounded-2xl border border-rose-500/20 bg-card/80 backdrop-blur-sm p-6 space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {state === "starting" && (
                        <>
                            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                            <span className="text-sm text-muted-foreground">Mikrofon ulanmoqda...</span>
                        </>
                    )}
                    {state === "recording" && (
                        <>
                            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-sm font-semibold text-rose-400">Yozib olinmoqda</span>
                        </>
                    )}
                    {(state === "stopping" || state === "done") && (
                        <>
                            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                            <span className="text-sm text-muted-foreground">Saqlanmoqda...</span>
                        </>
                    )}
                </div>
                {state === "recording" && (
                    <button
                        onClick={stopRecording}
                        className="py-2 px-5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-semibold text-sm flex items-center gap-2 hover:bg-rose-500/25 transition-all active:scale-[0.97]"
                    >
                        <Square className="w-4 h-4" />
                        Tugatish
                    </button>
                )}
            </div>

            {/* Waveform Canvas */}
            <div className="relative rounded-xl bg-background/50 border border-border overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={600}
                    height={100}
                    className="w-full h-24"
                />
                {state === "starting" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Mic className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                )}
            </div>

            {/* Hint */}
            {state === "recording" && (
                <p className="text-xs text-muted-foreground text-center">
                    Arab tilida javob bering. "Tugatish" tugmasini bosing yoki vaqt tugashini kuting.
                </p>
            )}
        </div>
    );
}
