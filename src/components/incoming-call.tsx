"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center space-y-6 animate-fade-in shadow-2xl">
        {/* Avatar pulse */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-3xl font-bold text-primary">
              {callerName[0]?.toUpperCase() || "?"}
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">{callerName}</h2>
          <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
            {callType === "video" ? (
              <>
                <Video className="w-3.5 h-3.5" />
                Video Call
              </>
            ) : (
              <>
                <Phone className="w-3.5 h-3.5" />
                Voice Call
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4 justify-center">
          <Button
            size="lg"
            variant="destructive"
            className="w-16 h-16 rounded-full p-0"
            onClick={onReject}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
          <Button
            size="lg"
            className="w-16 h-16 rounded-full p-0 bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={onAccept}
          >
            {callType === "video" ? (
              <Video className="w-6 h-6" />
            ) : (
              <Phone className="w-6 h-6" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
