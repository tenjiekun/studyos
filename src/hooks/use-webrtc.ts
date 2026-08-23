"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getSupabase } from "@/lib/supabase/client";

// Free STUN servers for NAT traversal
const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export type CallState = "idle" | "outgoing" | "incoming" | "connected";
export type CallType = "audio" | "video";

interface CallSignal {
  type: "offer" | "answer" | "ice-candidate" | "accept" | "reject" | "end";
  senderId: string;
  data?: RTCSessionDescriptionInit | RTCIceCandidateInit;
  callType?: CallType;
}

interface UseWebRTCOptions {
  conversationId: string;
  currentUserId: string;
}

export function useWebRTC({ conversationId, currentUserId }: UseWebRTCOptions) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType>("audio");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callerName, setCallerName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<NonNullable<ReturnType<typeof getSupabase>>["channel"]> | null>(null);
  const remoteUserIdRef = useRef<string>("");
  const callTypeRef = useRef<CallType>("audio");

  // Clean up everything
  const cleanup = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    remoteStreamRef.current = null;
    setIsMuted(false);
    setIsCameraOff(false);
    setError(null);
  }, []);

  // Get media stream
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
      setError("Could not access camera/microphone. Please check permissions.");
      return null;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          const signal: CallSignal = {
            type: "ice-candidate",
            senderId: currentUserId,
            data: event.candidate.toJSON(),
          };
          channelRef.current.send({
            type: "broadcast",
            event: "call-signal",
            payload: signal,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          endCall();
        }
      };

      peerConnection.current = pc;
      return pc;
    },
    [currentUserId]
  );

  // Set up signaling channel
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const sb = getSupabase();
    if (!sb) return;

    const channel = sb.channel(`call-${conversationId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "call-signal" }, async (payload) => {
        const signal = payload.payload as CallSignal;

        // Ignore own signals
        if (signal.senderId === currentUserId) return;

        switch (signal.type) {
          case "offer": {
            // Incoming call
            remoteUserIdRef.current = signal.senderId;
            callTypeRef.current = signal.callType || "audio";

            // Get caller name
            const { data: profile } = await sb
              .from("profiles")
              .select("name")
              .eq("id", signal.senderId)
              .single();
            setCallerName(profile?.name || "Someone");
            setCallType(signal.callType || "audio");
            setCallState("incoming");
            break;
          }

          case "accept": {
            // Call accepted — create answer
            if (!peerConnection.current) return;

            try {
              const answer = await peerConnection.current.createAnswer();
              await peerConnection.current.setLocalDescription(answer);

              const sig: CallSignal = {
                type: "answer",
                senderId: currentUserId,
                data: answer,
              };
              channel.send({
                type: "broadcast",
                event: "call-signal",
                payload: sig,
              });
            } catch (err) {
              console.error("Failed to create answer:", err);
            }
            break;
          }

          case "answer": {
            // Got answer — set remote description
            if (!peerConnection.current || !signal.data) return;
            try {
              await peerConnection.current.setRemoteDescription(
                signal.data as RTCSessionDescriptionInit
              );
              setCallState("connected");
            } catch (err) {
              console.error("Failed to set remote description:", err);
            }
            break;
          }

          case "ice-candidate": {
            if (!peerConnection.current || !signal.data) return;
            try {
              await peerConnection.current.addIceCandidate(
                new RTCIceCandidate(signal.data as RTCIceCandidateInit)
              );
            } catch (err) {
              console.error("Failed to add ICE candidate:", err);
            }
            break;
          }

          case "reject":
          case "end": {
            cleanup();
            setCallState("idle");
            break;
          }
        }
      })
      .subscribe();

    return () => {
      sb.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, currentUserId, cleanup]);

  // Start a call
  const startCall = useCallback(
    async (type: CallType) => {
      const stream = await getMediaStream(type === "video");
      if (!stream) return;

      setCallType(type);
      callTypeRef.current = type;
      setCallState("outgoing");

      const pc = createPeerConnection(stream);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (channelRef.current) {
          const signal: CallSignal = {
            type: "offer",
            senderId: currentUserId,
            data: offer,
            callType: type,
          };
          channelRef.current.send({
            type: "broadcast",
            event: "call-signal",
            payload: signal,
          });
        }
      } catch (err) {
        console.error("Failed to create offer:", err);
        cleanup();
        setCallState("idle");
      }
    },
    [currentUserId, getMediaStream, createPeerConnection, cleanup]
  );

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    const stream = await getMediaStream(callTypeRef.current === "video");
    if (!stream) return;

    const pc = createPeerConnection(stream);
    setCallState("connected");

    if (channelRef.current) {
      const signal: CallSignal = {
        type: "accept",
        senderId: currentUserId,
      };
      channelRef.current.send({
        type: "broadcast",
        event: "call-signal",
        payload: signal,
      });
    }
  }, [currentUserId, getMediaStream, createPeerConnection]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (channelRef.current) {
      const signal: CallSignal = {
        type: "reject",
        senderId: currentUserId,
      };
      channelRef.current.send({
        type: "broadcast",
        event: "call-signal",
        payload: signal,
      });
    }
    setCallState("idle");
  }, [currentUserId]);

  // End ongoing call
  const endCall = useCallback(() => {
    if (channelRef.current) {
      const signal: CallSignal = {
        type: "end",
        senderId: currentUserId,
      };
      channelRef.current.send({
        type: "broadcast",
        event: "call-signal",
        payload: signal,
      });
    }
    cleanup();
    setCallState("idle");
  }, [currentUserId, cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    callState,
    callType,
    remoteStream,
    localStream,
    isMuted,
    isCameraOff,
    callerName,
    error,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}
