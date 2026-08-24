"use client";

import { useEffect, useState } from "react";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  VideoOff,
} from "lucide-react";
import { fetchCallHistory } from "@/lib/community/dm";
import { CallLog } from "@/lib/types";
import { formatDistanceToNow, format } from "date-fns";

interface CallHistoryProps {
  conversationId: string;
  currentUserId: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds === 0) return "";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

function CallLogEntry({ log, currentUserId }: { log: CallLog; currentUserId: string }) {
  const isCaller = log.caller_id === currentUserId;
  const isVideo = log.call_type === "video";

  let icon = <Phone className="w-3.5 h-3.5" />;
  let label = "";
  let textColor = "text-muted-foreground";

  if (log.status === "missed") {
    icon = <PhoneMissed className="w-3.5 h-3.5 text-red-500" />;
    label = isCaller ? "Outgoing call missed" : "Missed call";
    textColor = "text-red-500";
  } else if (log.status === "declined") {
    icon = <PhoneMissed className="w-3.5 h-3.5 text-red-500" />;
    label = isCaller ? "Call declined" : "Call declined";
    textColor = "text-red-500";
  } else if (isVideo) {
    icon = isCaller ? (
      <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-500" />
    ) : (
      <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
    );
    label = isCaller ? "Outgoing video call" : "Incoming video call";
  } else {
    icon = isCaller ? (
      <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-500" />
    ) : (
      <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
    );
    label = isCaller ? "Outgoing voice call" : "Incoming voice call";
  }

  const duration = log.status === "completed" ? formatDuration(log.duration_seconds) : null;

  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
        <span className={textColor}>{icon}</span>
        <span className={textColor}>{label}</span>
        {duration && (
          <span className="text-muted-foreground">· {duration}</span>
        )}
        <span className="text-muted-foreground">
          · {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

export function CallHistory({ conversationId, currentUserId }: CallHistoryProps) {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchCallHistory(conversationId, 10);
      setLogs(data);
      setLoading(false);
    }
    load();
  }, [conversationId]);

  if (loading || logs.length === 0) return null;

  return (
    <div className="space-y-2 py-2">
      {logs.map((log) => (
        <CallLogEntry key={log.id} log={log} currentUserId={currentUserId} />
      ))}
    </div>
  );
}

// Compact call history for the DM list view
export function CallHistoryBadge({ log, currentUserId }: { log: CallLog; currentUserId: string }) {
  const isCaller = log.caller_id === currentUserId;
  const isVideo = log.call_type === "video";

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      {log.status === "missed" || log.status === "declined" ? (
        <PhoneMissed className="w-3 h-3 text-red-500" />
      ) : isVideo ? (
        <Video className="w-3 h-3" />
      ) : isCaller ? (
        <PhoneOutgoing className="w-3 h-3" />
      ) : (
        <PhoneIncoming className="w-3 h-3" />
      )}
      <span>
        {log.status === "missed" ? "Missed" : log.status === "declined" ? "Declined" : formatDuration(log.duration_seconds)}
      </span>
    </div>
  );
}
