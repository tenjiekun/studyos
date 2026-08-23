"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Trash2, Send, Play, Pause } from "lucide-react";

interface VoiceRecorderProps {
  onSend: (blob: Blob) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "preview">("idle");
  const [duration, setDuration] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        blobRef.current = blob;
        setState("preview");

        // Create audio for preview
        const audio = new Audio(URL.createObjectURL(blob));
        audioRef.current = audio;
        audio.addEventListener("loadedmetadata", () => {
          // Use actual duration or the timer value
        });
        audio.addEventListener("ended", () => {
          setIsPlaying(false);
          setPlaybackProgress(0);
        });
      };

      mediaRecorder.start(100);
      setState("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      onCancel();
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function cancelRecording() {
    stopRecording();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
    }
    blobRef.current = null;
    setState("idle");
    setDuration(0);
    setPlaybackProgress(0);
    setIsPlaying(false);
    onCancel();
  }

  function handleSend() {
    if (blobRef.current) {
      onSend(blobRef.current);
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    blobRef.current = null;
  }

  function togglePlayback() {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      playbackTimerRef.current = setInterval(() => {
        if (audioRef.current) {
          setPlaybackProgress(audioRef.current.currentTime);
        }
      }, 100);
    }
    setIsPlaying(!isPlaying);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  // Auto-start recording
  useEffect(() => {
    if (state === "idle") {
      startRecording();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === "recording") {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-medium">Recording...</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-muted-foreground"
          onClick={cancelRecording}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          className="h-9 w-9 p-0 rounded-full bg-red-500 hover:bg-red-600"
          onClick={stopRecording}
        >
          <Square className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (state === "preview") {
    return (
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 shrink-0 rounded-full"
          onClick={togglePlayback}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{
                width:
                  duration > 0
                    ? `${(playbackProgress / duration) * 100}%`
                    : "0%",
              }}
            />
          </div>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {formatTime(isPlaying ? playbackProgress : duration)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-muted-foreground"
          onClick={cancelRecording}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          className="h-9 w-9 p-0 rounded-full"
          onClick={handleSend}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return null;
}
