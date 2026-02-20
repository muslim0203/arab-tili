// ─────────────────────────────────────────────────
// Writing Task Component – single task editor
// Timer (28 min), textarea, word counter, autosave,
// virtual Arabic keyboard toggle
// ─────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Timer } from "./Timer";
import { createDeadline } from "@/utils/timer";
import { countArabicWords, getWordCountStatus, getWordCountColor, getWordCountBgColor } from "@/utils/word-count";
import {
    PenTool,
    ArrowRight,
    AlertTriangle,
    Keyboard,
    X,
} from "lucide-react";
import type { WritingTask } from "@/types/exam";

interface WritingTaskComponentProps {
    task: WritingTask;
    taskNumber: number;
    totalTasks: number;
    initialText: string;
    onTextChange: (text: string, wordCount: number) => void;
    onComplete: (text: string, wordCount: number) => void;
}

const TASK_TIME_SEC = 28 * 60; // 28 minutes
const AUTOSAVE_INTERVAL = 5000; // 5 seconds

const difficultyLabels: Record<string, { text: string; color: string; bg: string }> = {
    easy: { text: "Oson", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
    hard: { text: "Qiyin", color: "text-red-400", bg: "bg-red-500/15 border-red-500/30" },
};

// Simple Arabic keyboard layout
const ARABIC_KEYS = [
    ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج", "د"],
    ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ط"],
    ["ئ", "ء", "ؤ", "ر", "لا", "ى", "ة", "و", "ز", "ظ"],
    ["َ", "ُ", "ِ", "ً", "ٌ", "ٍ", "ْ", "ّ"],
];

export function WritingTaskComponent({
    task,
    taskNumber,
    totalTasks,
    initialText,
    onTextChange,
    onComplete,
}: WritingTaskComponentProps) {
    const [text, setText] = useState(initialText);
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lastSavedRef = useRef(initialText);
    const completedRef = useRef(false);

    const [deadline] = useState(() => createDeadline(TASK_TIME_SEC));
    const diff = difficultyLabels[task.difficulty] ?? difficultyLabels.easy;

    const wordCount = useMemo(() => countArabicWords(text), [text]);
    const wordStatus = getWordCountStatus(wordCount);
    const wordColor = getWordCountColor(wordStatus);
    const wordBgColor = getWordCountBgColor(wordStatus);

    // Autosave
    useEffect(() => {
        const interval = setInterval(() => {
            if (text !== lastSavedRef.current) {
                onTextChange(text, countArabicWords(text));
                lastSavedRef.current = text;
            }
        }, AUTOSAVE_INTERVAL);
        return () => clearInterval(interval);
    }, [text, onTextChange]);

    // Timer expired
    const handleTimerExpire = useCallback(() => {
        if (completedRef.current) return;
        completedRef.current = true;
        const wc = countArabicWords(text);
        onComplete(text, wc);
    }, [text, onComplete]);

    // Click "Next"
    const handleNext = useCallback(() => {
        if (wordCount < 80) {
            setShowConfirm(true);
            return;
        }
        if (completedRef.current) return;
        completedRef.current = true;
        onComplete(text, wordCount);
    }, [text, wordCount, onComplete]);

    // Confirm skip with low word count
    const handleConfirmNext = useCallback(() => {
        if (completedRef.current) return;
        completedRef.current = true;
        setShowConfirm(false);
        onComplete(text, wordCount);
    }, [text, wordCount, onComplete]);

    // Insert character from virtual keyboard
    const handleKeyPress = useCallback((char: string) => {
        const ta = textareaRef.current;
        if (!ta) return;

        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const before = text.slice(0, start);
        const after = text.slice(end);
        const newText = before + char + after;
        setText(newText);

        // Restore cursor position
        requestAnimationFrame(() => {
            ta.focus();
            const pos = start + char.length;
            ta.setSelectionRange(pos, pos);
        });
    }, [text]);

    // Handle textarea change
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5 flex items-center justify-center p-4">
            <div className="max-w-3xl w-full space-y-5">
                {/* Header bar */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Vazifa {taskNumber}/{totalTasks}
                        </span>
                        <span
                            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${diff.bg} ${diff.color}`}
                        >
                            {diff.text}
                        </span>
                    </div>
                    <Timer
                        deadline={deadline}
                        onExpire={handleTimerExpire}
                        size="sm"
                        label="Yozish"
                        warnAt={300}
                        dangerAt={60}
                    />
                </div>

                {/* Task Card */}
                <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-lg overflow-hidden">
                    {/* Prompt */}
                    <div className="p-6 border-b border-border">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                                <PenTool className="w-4 h-4 text-amber-500" />
                            </div>
                            <span className="text-sm font-semibold text-amber-500">
                                Yozuv vazifasi
                            </span>
                        </div>
                        <div
                            className="text-xl md:text-2xl font-bold leading-relaxed text-card-foreground"
                            dir="rtl"
                            lang="ar"
                            style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
                        >
                            {task.prompt}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                            Maksimum ball: {task.maxScore} · Tavsiya etilgan so'z soni: 100 (80–130)
                        </p>
                    </div>

                    {/* Textarea */}
                    <div className="p-6">
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={handleChange}
                            dir="rtl"
                            lang="ar"
                            placeholder="هنا اكتب إجابتك..."
                            className="w-full min-h-[240px] md:min-h-[300px] p-4 rounded-xl border border-border bg-background text-foreground text-base leading-loose resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all"
                            style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif", fontSize: "18px" }}
                        />

                        {/* Word counter & controls */}
                        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                            {/* Word count badge */}
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${wordBgColor} ${wordColor}`}>
                                <span>So'z: {wordCount}</span>
                                <span className="text-xs opacity-70">/ Tavsiya: 100</span>
                            </div>

                            {/* Virtual keyboard toggle */}
                            <button
                                onClick={() => setShowKeyboard(!showKeyboard)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${showKeyboard
                                        ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                        : "bg-card border-border text-muted-foreground hover:text-amber-400 hover:border-amber-500/30"
                                    }`}
                            >
                                <Keyboard className="w-3.5 h-3.5" />
                                Arab klaviaturasi
                            </button>
                        </div>

                        {/* Word count warning */}
                        {wordStatus === "danger" && wordCount > 0 && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-red-400">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                So'z soni juda kam. Kamida 80 ta so'z yozing.
                            </div>
                        )}
                        {wordStatus === "over" && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-yellow-400">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                So'z soni tavsiyadan ortiq. 130 dan oshmasligi tavsiya etiladi.
                            </div>
                        )}
                    </div>
                </div>

                {/* Virtual Arabic Keyboard */}
                {showKeyboard && (
                    <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-sm p-4 shadow-xl relative">
                        <button
                            onClick={() => setShowKeyboard(false)}
                            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-all"
                        >
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <p className="text-xs text-muted-foreground mb-3 font-semibold">Virtual klaviatura</p>
                        <div className="space-y-2" dir="rtl">
                            {ARABIC_KEYS.map((row, ri) => (
                                <div key={ri} className="flex flex-wrap gap-1 justify-center">
                                    {row.map((key) => (
                                        <button
                                            key={key}
                                            onClick={() => handleKeyPress(key)}
                                            className="w-9 h-9 rounded-lg bg-muted/80 border border-border text-card-foreground font-semibold text-sm hover:bg-amber-500/15 hover:border-amber-500/30 hover:text-amber-400 active:scale-90 transition-all"
                                            style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
                                        >
                                            {key}
                                        </button>
                                    ))}
                                </div>
                            ))}
                            {/* Space & Enter */}
                            <div className="flex gap-1 justify-center mt-1">
                                <button
                                    onClick={() => handleKeyPress(" ")}
                                    className="px-12 h-9 rounded-lg bg-muted/80 border border-border text-muted-foreground text-xs hover:bg-amber-500/15 hover:border-amber-500/30 transition-all"
                                >
                                    مسافة
                                </button>
                                <button
                                    onClick={() => handleKeyPress("\n")}
                                    className="px-6 h-9 rounded-lg bg-muted/80 border border-border text-muted-foreground text-xs hover:bg-amber-500/15 hover:border-amber-500/30 transition-all"
                                >
                                    ↵ سطر
                                </button>
                                <button
                                    onClick={() => handleKeyPress(".")}
                                    className="w-9 h-9 rounded-lg bg-muted/80 border border-border text-card-foreground text-sm hover:bg-amber-500/15 hover:border-amber-500/30 transition-all"
                                >
                                    .
                                </button>
                                <button
                                    onClick={() => handleKeyPress("،")}
                                    className="w-9 h-9 rounded-lg bg-muted/80 border border-border text-card-foreground text-sm hover:bg-amber-500/15 hover:border-amber-500/30 transition-all"
                                >
                                    ،
                                </button>
                                <button
                                    onClick={() => handleKeyPress("؟")}
                                    className="w-9 h-9 rounded-lg bg-muted/80 border border-border text-card-foreground text-sm hover:bg-amber-500/15 hover:border-amber-500/30 transition-all"
                                >
                                    ؟
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Next / Submit button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleNext}
                        className="py-3 px-8 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-amber-500/30 transition-all active:scale-[0.97]"
                    >
                        {taskNumber < totalTasks ? "Keyingi vazifa" : "Topshirish"}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Low word count confirmation modal */}
                {showConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="max-w-sm w-full rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-card-foreground">Kam so'z yozildi</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Siz {wordCount} ta so'z yozdingiz. Kamida 80 ta tavsiya etiladi.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-border bg-card text-card-foreground font-semibold text-sm hover:bg-muted/50 transition-all"
                                >
                                    Davom etish
                                </button>
                                <button
                                    onClick={handleConfirmNext}
                                    className="flex-1 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold text-sm hover:bg-amber-500/25 transition-all"
                                >
                                    Shu holatda topshirish
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
