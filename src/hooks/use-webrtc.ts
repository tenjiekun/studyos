"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { startCallLog, endCallLog } from "@/lib/community/dm";

const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export type CallState = "idle" | "outgoing" | "incoming" | "connecting" | "connected";
export type CallType = "audio" | "video";

interface UseWebRTCOptions {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
}

// Unique ID for this session to deduplicate signals
const SESSION_ID = Math.random().toString(36).slice(2, 10);

// ===== Sounds =====
function createRingtone(): { play: () => void; stop: () => void } {
  let ctx: AudioContext | null = null;
  let id: ReturnType<typeof setInterval> | null = null;
  let toggled = false;

  function play() {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      function tone() {
        if (!ctx) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine";
        o.frequency.value = toggled ? 523.25 : 659.25;
        g.gain.setValueAtTime(0.3, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.4);
        toggled = !toggled;
      }
      tone(); id = setInterval(tone, 500);
    } catch {}
  }
  function stop() {
    if (id) { clearInterval(id); id = null; }
    if (ctx) { ctx.close().catch(() => {}); ctx = null; }
  }
  return { play, stop };
}

function playSound(type: "connect" | "hangup") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine";
    if (type === "connect") {
      o.frequency.setValueAtTime(523.25, ctx.currentTime);
      o.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
      o.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.5);
    } else {
      o.frequency.setValueAtTime(400, ctx.currentTime);
      o.frequency.setValueAtTime(300, ctx.currentTime + 0.15);
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.3);
    }
  } catch {}
}

export function useWebRTC({ conversationId, currentUserId, otherUserId, otherUserName }: UseWebRTCOptions) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType>("audio");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callerName, setCallerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callLogIdRef = useRef<string | null>(null);
  const callStateRef = useRef<CallState>("idle");
  const callTypeRef = useRef<CallType>("audio");
  const remoteUserIdRef = useRef("");
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callDurationRef = useRef(0);
  const ringtoneRef = useRef<ReturnType<typeof createRingtone> | null>(null);
  const mountedRef = useRef(true);
  const processedSignalIdsRef = useRef<Set<string>>(new Set());
  const otherUserNameRef = useRef(otherUserName);
  const currentUserIdRef = useRef(currentUserId);
  const conversationIdRef = useRef(conversationId);

  // Keep refs up to date
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { otherUserNameRef.current = otherUserName; }, [otherUserName]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);

  // ===== Send signal via MULTIPLE channels =====
  const sendSignal = useCallback(async (
    signalType: string,
    signalData?: any,
    callTypeVal?: CallType,
    senderName?: string
  ) => {
    const sb = getSupabase();
    if (!sb) return;

    const payload = {
      conversation_id: conversationIdRef.current,
      sender_id: currentUserIdRef.current,
      signal_type: signalType,
      call_type: callTypeVal || callTypeRef.current,
      sender_name: senderName || otherUserNameRef.current,
      signal_data: signalData || null,
      session_id: SESSION_ID,
    };

    // Method 1: Broadcast channel (instant, no DB)
    try {
      const channel = sb.channel(`calls-${conversationIdRef.current}`);
      await channel.send({
        type: "broadcast",
        event: "signal",
        payload,
      });
      console.log(`📡 Broadcast signal: ${signalType}`);
    } catch (err) {
      console.warn("Broadcast failed, trying DB:", err);
    }

    // Method 2: Database insert (reliable fallback)
    try {
      const { error: insertErr } = await sb.from("call_signals").insert({
        conversation_id: payload.conversation_id,
        sender_id: payload.sender_id,
        signal_type: payload.signal_type,
        call_type: payload.call_type,
        sender_name: payload.sender_name,
        signal_data: payload.signal_data,
      });
      if (insertErr) {
        console.warn("DB signal insert failed:", insertErr.message);
      } else {
        console.log(`💾 DB signal sent: ${signalType}`);
      }
    } catch (err) {
      console.warn("DB signal failed:", err);
    }
  }, []);

  // ===== Cleanup =====
  const cleanup = useCallback(() => {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
    if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
    incomingOfferRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallDuration(0);
    callDurationRef.current = 0;
    setIsMuted(false);
    setIsCameraOff(false);
    setError(null);
  }, []);

  const startDurationTimer = useCallback(() => {
    callDurationRef.current = 0;
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => {
      callDurationRef.current += 1;
      setCallDuration(callDurationRef.current);
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
  }, []);

  // ===== Get media =====
  const getMediaStream = useCallback(async (video: boolean): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Failed to get media:", err);
      setError("Could not access camera/microphone. Check browser permissions.");
      return null;
    }
  }, []);

  // ===== Process an incoming signal =====
  const processSignal = useCallback(async (row: any) => {
    if (!mountedRef.current) return;
    // Skip own signals
    if (row.sender_id === currentUserIdRef.current) return;
    // Skip already processed
    if (processedSignalIdsRef.current.has(row.id)) return;
    processedSignalIdsRef.current.add(row.id);

    const data = row.signal_data;
    console.log(`📥 Processing signal: ${row.signal_type} from ${row.sender_name}`);

    switch (row.signal_type) {
      case "offer": {
        console.log("📞 Received offer from", row.sender_name);
        remoteUserIdRef.current = row.sender_id;
        callTypeRef.current = row.call_type || "audio";
        incomingOfferRef.current = data as RTCSessionDescriptionInit;
        setCallerName(row.sender_name || "Someone");
        setCallType(row.call_type || "audio");
        setCallState("incoming");

        const ring = createRingtone();
        ringtoneRef.current = ring;
        ring.play();

        setTimeout(() => {
          if (callStateRef.current === "incoming" && ringtoneRef.current) {
            ringtoneRef.current.stop();
            ringtoneRef.current = null;
            setCallState("idle");
          }
        }, 30000);
        break;
      }

      case "accept": {
        console.log("✅ Call accepted by", row.sender_name);
        if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
        if (!callLogIdRef.current) {
          const logId = await startCallLog(conversationIdRef.current, currentUserIdRef.current, row.sender_id, callTypeRef.current);
          callLogIdRef.current = logId;
        }
        setCallState("connecting");
        break;
      }

      case "answer": {
        console.log("📋 Received answer");
        const pc = pcRef.current;
        if (!pc) {
          console.error("❌ No peer connection to apply answer to!");
          return;
        }
        if (!data) {
          console.error("❌ No answer data!");
          return;
        }
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data as RTCSessionDescriptionInit));
          console.log("✅ Set remote description (answer) — connection should establish now");
        } catch (err) {
          console.error("❌ Failed to set remote desc:", err);
        }
        break;
      }

      case "ice-candidate": {
        const pc = pcRef.current;
        if (!pc || !data) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data as RTCIceCandidateInit));
          console.log("✅ Added ICE candidate");
        } catch (err) {
          console.error("❌ Failed to add ICE candidate:", err);
        }
        break;
      }

      case "reject": {
        if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
        if (callLogIdRef.current) { endCallLog(callLogIdRef.current, "declined"); callLogIdRef.current = null; }
        playSound("hangup");
        stopDurationTimer();
        cleanup();
        setCallState("idle");
        break;
      }

      case "end": {
        if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
        if (callLogIdRef.current) { endCallLog(callLogIdRef.current, "completed"); callLogIdRef.current = null; }
        playSound("hangup");
        stopDurationTimer();
        cleanup();
        setCallState("idle");
        break;
      }
    }
  }, [cleanup, stopDurationTimer]);

  // ===== Listen for signals: broadcast channel + DB polling =====
  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    const sb = getSupabase();
    if (!sb) return;

    mountedRef.current = true;
    console.log(`🎧 Listening for signals on conversation ${conversationId}`);

    // --- Method 1: Broadcast channel (instant) ---
    const broadcastChannel = sb
      .channel(`calls-${conversationId}`)
      .on("broadcast", { event: "signal" }, (payload) => {
        console.log("📡 Got broadcast signal");
        processSignal(payload.payload);
      })
      .subscribe((status) => {
        console.log("📡 Broadcast channel status:", status);
      });

    // --- Method 2: DB polling (reliable fallback, every 800ms) ---
    let pollCount = 0;
    const pollInterval = setInterval(async () => {
      if (!mountedRef.current) return;
      try {
        const { data: signals, error } = await sb
          .from("call_signals")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(20);

        if (error) {
          // Table might not exist — that's OK, broadcast handles it
          if (pollCount === 0) {
            console.warn("⚠️ call_signals table may not exist. Run supabase/call-signals.sql");
          }
          pollCount++;
          return;
        }

        if (signals && signals.length > 0) {
          for (const signal of signals) {
            await processSignal(signal);
          }
        }
      } catch (err) {
        // Silently ignore poll errors
      }
    }, 800);

    return () => {
      mountedRef.current = false;
      sb.removeChannel(broadcastChannel);
      clearInterval(pollInterval);
    };
  }, [conversationId, currentUserId, processSignal]);

  // ===== Create PeerConnection =====
  const createPC = useCallback((stream: MediaStream,对方UserId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      const [remote] = event.streams;
      if (remote) {
        console.log("🎉 Got remote stream!", remote.getTracks().map(t => t.kind));
        setRemoteStream(remote);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 Sending ICE candidate");
        sendSignal("ice-candidate", event.candidate.toJSON());
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("🧊 ICE state:", pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      if (!mountedRef.current) return;
      console.log("🔗 Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        playSound("connect");
        startDurationTimer();
        setCallState("connected");
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        console.warn("⚠️ Connection failed/disconnected, cleaning up");
        if (callStateRef.current !== "idle") {
          stopDurationTimer();
          cleanup();
          setCallState("idle");
        }
      }
    };

    pcRef.current = pc;
    return pc;
  }, [sendSignal, startDurationTimer, stopDurationTimer, cleanup]);

  // ===== Caller: Start Call =====
  const startCall = useCallback(async (type: CallType) => {
    const stream = await getMediaStream(type === "video");
    if (!stream) return;

    setCallType(type);
    callTypeRef.current = type;
    remoteUserIdRef.current = otherUserId;
    setCallState("outgoing");
    setCallerName(otherUserName || "Calling...");

    const ring = createRingtone();
    ringtoneRef.current = ring;
    ring.play();

    const pc = createPC(stream, otherUserId);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal("offer", offer, type, otherUserName);
      console.log("📤 Sent offer — waiting for answer...");
    } catch (err) {
      console.error("Failed to create offer:", err);
      if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
      cleanup();
      setCallState("idle");
      return;
    }

    // Auto-cancel after 45s
    setTimeout(() => {
      if (callStateRef.current === "outgoing") {
        if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
        cleanup();
        setCallState("idle");
      }
    }, 45000);
  }, [otherUserId, otherUserName, getMediaStream, createPC, sendSignal, cleanup]);

  // ===== Receiver: Accept Call =====
  const acceptCall = useCallback(async () => {
    if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }

    const offer = incomingOfferRef.current;
    if (!offer) {
      console.error("❌ No incoming offer stored!");
      return;
    }

    const video = callTypeRef.current === "video";
    const stream = await getMediaStream(video);
    if (!stream) return;

    const pc = createPC(stream, remoteUserIdRef.current);

    // CRITICAL: Set remote description BEFORE creating answer
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("✅ Set remote description (offer)");
    } catch (err) {
      console.error("❌ Failed to set remote offer:", err);
      return;
    }

    // Create answer
    try {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("✅ Created answer");

      // Log the call
      if (!callLogIdRef.current) {
        const logId = await startCallLog(conversationIdRef.current, remoteUserIdRef.current, currentUserIdRef.current, callTypeRef.current);
        callLogIdRef.current = logId;
      }

      // Send accept + answer (answer contains the SDP)
      await sendSignal("accept");
      await sendSignal("answer", answer);
      console.log("📤 Sent accept + answer — waiting for connection...");

      setCallState("connecting");
    } catch (err) {
      console.error("❌ Failed to create answer:", err);
    }
  }, [getMediaStream, createPC, sendSignal]);

  // ===== Reject =====
  const rejectCall = useCallback(() => {
    if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
    playSound("hangup");
    sendSignal("reject");
    if (callLogIdRef.current) { endCallLog(callLogIdRef.current, "declined"); callLogIdRef.current = null; }
    setCallState("idle");
  }, [sendSignal]);

  // ===== End =====
  const endCall = useCallback(() => {
    if (ringtoneRef.current) { ringtoneRef.current.stop(); ringtoneRef.current = null; }
    playSound("hangup");
    sendSignal("end");
    if (callLogIdRef.current) { endCallLog(callLogIdRef.current, "completed"); callLogIdRef.current = null; }
    stopDurationTimer();
    cleanup();
    setCallState("idle");
  }, [sendSignal, stopDurationTimer, cleanup]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsCameraOff(!track.enabled); }
  }, []);

  useEffect(() => {
    return () => { mountedRef.current = false; cleanup(); };
  }, [cleanup]);

  return {
    callState, callType, remoteStream, localStream,
    isMuted, isCameraOff, callerName, error, callDuration,
    startCall, acceptCall, rejectCall, endCall,
    toggleMute, toggleCamera,
  };
}
