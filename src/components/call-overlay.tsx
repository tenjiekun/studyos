"use client";

import { useRef, useEffect } from "react";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CallType } from "@/hooks/use-webrtc";

function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

interface CallOverlayProps {
  callType: CallType;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  otherUserName: string;
  isMuted: boolean;
  isCameraOff: boolean;
  callDuration: number;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
}

function VideoStream({
  stream,
  muted,
  label,
  isLocal,
}: {
  stream: MediaStream;
  muted?: boolean;
  label: string;
  isLocal?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black/80">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted || isLocal}
        className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""}`}
        style={{ minHeight: "200px" }}
      />
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
        {label}
      </div>
    </div>
  );
}

export function CallOverlay({
  callType,
  localStream,
  remoteStream,
  otherUserName,
  isMuted,
  isCameraOff,
  callDuration,
  onToggleMute,
  onToggleCamera,
  onEndCall,
}: CallOverlayProps) {
  if (callType === "audio") {
    // Audio-only call UI
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-primary/20 to-background flex flex-col items-center justify-center">
        <div className="text-center space-y-6">
          {/* Avatar */}
          <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center mx-auto animate-pulse-soft">
            <span className="text-4xl font-bold text-primary">
              {otherUserName[0]?.toUpperCase() || "?"}
            </span>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{otherUserName}</h2>
            <p className="text-sm text-muted-foreground mt-1">Voice Call</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{formatCallDuration(callDuration)}</p>
          </div>

          {/* Audio wave animation */}
          <div className="flex items-center justify-center gap-1">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full animate-pulse"
                style={{
                  height: `${12 + Math.random() * 20}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <Button
              size="lg"
              variant={isMuted ? "destructive" : "secondary"}
              className="w-14 h-14 rounded-full p-0"
              onClick={onToggleMute}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="w-16 h-16 rounded-full p-0"
              onClick={onEndCall}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Video call UI
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Remote video (full screen) */}
      <div className="flex-1 relative">
        {remoteStream ? (
          <VideoStream stream={remoteStream} label={otherUserName} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/80">
            <div className="text-center space-y-4">
              <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center mx-auto animate-pulse-soft">
                <span className="text-4xl font-bold text-primary">
                  {otherUserName[0]?.toUpperCase() || "?"}
                </span>
              </div>
              <p className="text-white/80 text-sm">Connecting...</p>
          <p className="text-white/60 text-xs font-mono">{formatCallDuration(callDuration)}</p>
            </div>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        {localStream && !isCameraOff && (
          <div className="absolute top-4 right-4 w-32 h-44 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
            <VideoStream stream={localStream} muted isLocal label="You" />
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            variant={isMuted ? "destructive" : "secondary"}
            className="w-14 h-14 rounded-full p-0 bg-white/10 hover:bg-white/20 text-white border-0"
            onClick={onToggleMute}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button
            size="lg"
            variant={isCameraOff ? "destructive" : "secondary"}
            className="w-14 h-14 rounded-full p-0 bg-white/10 hover:bg-white/20 text-white border-0"
            onClick={onToggleCamera}
          >
            {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>
          <Button
            size="lg"
            variant="destructive"
            className="w-16 h-16 rounded-full p-0"
            onClick={onEndCall}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
