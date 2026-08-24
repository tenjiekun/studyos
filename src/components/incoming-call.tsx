"use client";

import { Phone, PhoneOff, Video, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CallType } from "@/hooks/use-webrtc";

interface IncomingCallProps {
  callerName: string;
  callType: CallType;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCall({
  callerName,
  callType,
  onAccept,
  onReject,
}: IncomingCallProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl p-10 max-w-sm w-full text-center space-y-8 shadow-2xl animate-fade-in">
        {/* Pulsing avatar */}
        <div className="relative mx-auto w-32 h-32">
          {/* Ring pulse 1 */}
          <div className="absolute inset-[-16px] rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: "1.5s" }} />
          {/* Ring pulse 2 (delayed) */}
          <div className="absolute inset-[-32px] rounded-full border border-primary/20 animate-ping" style={{ animationDuration: "1.5s", animationDelay: "0.5s" }} />
          {/* Ring pulse 3 */}
          <div className="absolute inset-[-48px] rounded-full border border-primary/10 animate-ping" style={{ animationDuration: "1.5s", animationDelay: "1s" }} />

          {/* Avatar */}
          <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-4xl font-bold text-primary">
              {callerName[0]?.toUpperCase() || "?"}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{callerName}</h2>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            {callType === "video" ? (
              <>
                <Video className="w-4 h-4" />
                Incoming Video Call
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                Incoming Voice Call
              </>
            )}
          </p>

          {/* Ringing dots animation */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-6 justify-center pt-2">
          <div className="flex flex-col items-center gap-2">
            <Button
              size="lg"
              variant="destructive"
              className="w-16 h-16 rounded-full p-0 shadow-lg shadow-red-500/20"
              onClick={onReject}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
            <span className="text-[10px] text-muted-foreground">Decline</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button
              size="lg"
              className="w-16 h-16 rounded-full p-0 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
              onClick={onAccept}
            >
              {callType === "video" ? (
                <Video className="w-6 h-6" />
              ) : (
                <Phone className="w-6 h-6" />
              )}
            </Button>
            <span className="text-[10px] text-muted-foreground">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
