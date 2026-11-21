"use client";

import { Camera, Keyboard, Mic, RotateCcw, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { blobToWavBase64, imageToJpegBase64 } from "@/lib/client/media";
import { cn } from "@/lib/utils";

export type Reasoning =
  | { mode: "text"; text: string }
  | { mode: "voice"; data: string; mimeType: "audio/wav"; seconds: number }
  | { mode: "photo"; data: string; mimeType: "image/jpeg"; preview: string }
  | null;

type Tab = "text" | "voice" | "photo";

export function ReasoningInput({
  value,
  onChange,
  disabled,
}: {
  value: Reasoning;
  onChange: (r: Reasoning) => void;
  disabled?: boolean;
}) {
  const [tab, setTab] = useState<Tab>(value?.mode ?? "text");
  const [text, setText] = useState(value?.mode === "text" ? value.text : "");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const secRef = useRef(0);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    recRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    if (value === null) {
      setText("");
      setSeconds(0);
    }
  }, [value]);

  async function startRec() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setBusy(true);
        try {
          const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
          const data = await blobToWavBase64(blob);
          onChange({ mode: "voice", data, mimeType: "audio/wav", seconds: secRef.current });
        } catch {
          setError("Couldn't process that recording. Try again, or type your reasoning instead.");
        } finally {
          setBusy(false);
        }
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      setSeconds(0);
      secRef.current = 0;
      timer.current = setInterval(() => {
        secRef.current += 1;
        setSeconds(secRef.current);
        if (secRef.current >= 45) stopRec();
      }, 1000);
    } catch {
      setError("Microphone access was blocked. Allow it in your browser, or type your reasoning instead.");
    }
  }

  function stopRec() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRecording(false);
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
  }

  async function onPhoto(f: File | undefined) {
    if (!f) return;
    setError(null);
    setBusy(true);
    try {
      const { data, preview } = await imageToJpegBase64(f);
      onChange({ mode: "photo", data, mimeType: "image/jpeg", preview });
    } catch {
      setError("Couldn't read that image. Try a JPG or PNG photo.");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "text", label: "Type", icon: <Keyboard className="size-4" /> },
    { id: "voice", label: "Speak", icon: <Mic className="size-4" /> },
    { id: "photo", label: "Photo of working", icon: <Camera className="size-4" /> },
  ];

  return (
    <div className={cn("rounded-[12px] border border-dashed border-ink/30 bg-ink-wash/50 p-3 sm:p-4", disabled && "opacity-60")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14.5px] font-semibold text-navy">
          Explain your thinking <span className="font-normal text-slate">(optional, but this is how Samajh finds the why)</span>
        </p>
        <div className="flex rounded-[9px] bg-surface p-0.5 ring-1 ring-navy/10" role="tablist" aria-label="How to explain">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              disabled={disabled}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-[7px] px-2.5 text-[13px] font-semibold transition-colors",
                tab === t.id ? "bg-ink text-white" : "text-slate hover:text-navy",
              )}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        {tab === "text" && (
          <textarea
            value={text}
            disabled={disabled}
            onChange={(e) => {
              setText(e.target.value);
              onChange(e.target.value.trim() ? { mode: "text", text: e.target.value } : null);
            }}
            rows={3}
            placeholder="e.g. I think the first bulb uses up some current, so… (English, Hindi or Hinglish)"
            className="hand w-full resize-y rounded-[10px] border border-navy/15 bg-surface px-3 py-2 text-[18px] leading-relaxed text-ink placeholder:text-faint/80 focus:border-ink/50 focus:outline-none"
          />
        )}

        {tab === "voice" && (
          <div className="flex flex-wrap items-center gap-3">
            {!recording ? (
              <button
                type="button"
                disabled={disabled || busy}
                onClick={startRec}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-[14.5px] font-semibold text-navy ring-1 ring-navy/15 hover:ring-ink/50"
              >
                <span className="grid size-6 place-items-center rounded-full bg-redpen text-white">
                  <Mic className="size-3.5" />
                </span>
                {value?.mode === "voice" ? "Record again" : "Start recording"}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRec}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-redpen px-4 text-[14.5px] font-semibold text-white"
              >
                <Square className="size-3.5 fill-white" /> Stop · {seconds}s
              </button>
            )}
            {recording && (
              <span className="flex items-end gap-0.5" aria-hidden>
                {Array.from({ length: 12 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-redpen/70"
                    style={{ height: 6 + ((i * 7 + seconds * 5) % 18), transition: "height 300ms" }}
                  />
                ))}
              </span>
            )}
            {busy && <span className="text-[13.5px] text-slate">Preparing audio…</span>}
            {value?.mode === "voice" && !recording && !busy && (
              <span className="inline-flex items-center gap-2 text-[14px] text-good">
                Recorded {value.seconds}s. Gemini will transcribe it.
                <button type="button" className="text-slate hover:text-navy" onClick={() => onChange(null)} aria-label="Remove recording">
                  <X className="size-4" />
                </button>
              </span>
            )}
            {!recording && value?.mode !== "voice" && (
              <span className="text-[13.5px] text-slate">Talk it through in English, Hindi or Hinglish. Up to 45 seconds.</span>
            )}
          </div>
        )}

        {tab === "photo" && (
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
            {value?.mode === "photo" ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={value.preview} alt="Your handwritten working" className="h-20 w-auto rounded-md border border-navy/15 object-cover" />
                <div className="flex flex-col gap-1">
                  <span className="text-[14px] text-good">Photo ready. Gemini will read your handwriting.</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-slate hover:text-navy"
                    onClick={() => fileRef.current?.click()}
                  >
                    <RotateCcw className="size-3.5" /> Use a different photo
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-[14.5px] font-semibold text-navy ring-1 ring-navy/15 hover:ring-ink/50"
                >
                  <Camera className="size-4" /> {busy ? "Reading photo…" : "Add a photo"}
                </button>
                <span className="text-[13.5px] text-slate">Snap your rough work from your notebook. Samajh finds the step that went wrong.</span>
              </>
            )}
          </div>
        )}
        {error && <p className="mt-2 text-[13.5px] text-redpen">{error}</p>}
      </div>
    </div>
  );
}
