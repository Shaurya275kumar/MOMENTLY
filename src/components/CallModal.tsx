import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, VideoOff, Video as VideoIcon, Loader2 } from 'lucide-react';
import type { Profile } from '../lib/supabase';
import { WebRTCCall, sendCallInvite, type CallType, type CallStatus } from '../lib/webrtc';
import { useAuth } from '../lib/auth';

type Props = {
  conversationId: string;
  other: Profile;
  callType: CallType;
  isInitiator: boolean;
  onClose: () => void;
};

export default function CallModal({ conversationId, other, callType, isInitiator, onClose }: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<CallStatus>(isInitiator ? 'outgoing' : 'incoming');
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(callType === 'video');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const callRef = useRef<WebRTCCall | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const call = new WebRTCCall({
      conversationId,
      myId: user.id,
      otherId: other.id,
      callType,
      isInitiator,
      handlers: {
        onStatusChange: (s) => {
          setStatus(s);
          if (s === 'ended' || s === 'declined' || s === 'missed') {
            setTimeout(() => onClose(), 1500);
          }
        },
        onLocalStream: (stream) => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        },
        onRemoteStream: (stream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
        },
      },
    });

    callRef.current = call;

    if (isInitiator) {
      sendCallInvite(conversationId, user.id, callType);
      call.start().catch((e) => setError(e.message));
    } else {
      call.start().catch((e) => setError(e.message));
    }

    return () => {
      call.destroy();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const handleAccept = async () => {
    try {
      await callRef.current?.accept();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDecline = () => {
    callRef.current?.decline();
  };

  const handleEnd = () => {
    callRef.current?.end();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    callRef.current?.toggleMute(next);
  };

  const toggleVideo = () => {
    const next = !videoOn;
    setVideoOn(next);
    callRef.current?.toggleVideo(next);
  };

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const avatar = other.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(other.username)}&background=random`;
  const isVideo = callType === 'video';
  const isConnected = status === 'connected';
  const isOutgoing = status === 'outgoing';
  const isIncoming = status === 'incoming';

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#0b141a]">
      {/* Remote video (full screen) */}
      {isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover ${isConnected ? 'opacity-100' : 'opacity-0'}`}
        />
      )}

      {/* Overlay for non-connected states */}
      {!isConnected && (
        <div className="flex-1 flex flex-col items-center justify-center text-white px-6">
          <div className="relative mb-6">
            <img
              src={avatar}
              className="w-32 h-32 rounded-full object-cover ring-4 ring-white/20"
              alt={other.username}
            />
            {!isVideo && (
              <div className="absolute inset-0 rounded-full bg-[#0095f6]/20 animate-pulse" />
            )}
          </div>
          <h2 className="text-xl font-semibold mb-1">{other.username}</h2>
          <p className="text-sm text-white/60 mb-6">
            {isOutgoing && (isVideo ? 'Video calling…' : 'Calling…')}
            {isIncoming && (isVideo ? 'Incoming video call' : 'Incoming voice call')}
            {status === 'ended' && 'Call ended'}
            {status === 'declined' && 'Call declined'}
            {status === 'missed' && 'Call missed'}
          </p>

          {isOutgoing && (
            <Loader2 className="w-6 h-6 animate-spin text-white/40" />
          )}

          {isIncoming && (
            <div className="flex items-center gap-6 mt-2">
              <button
                onClick={handleDecline}
                className="w-14 h-14 rounded-full bg-[#ed4956] flex items-center justify-center active:scale-90 transition"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={handleAccept}
                className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center active:scale-90 transition"
              >
                {isVideo ? <VideoIcon className="w-6 h-6 text-white" /> : <Phone className="w-6 h-6 text-white" />}
              </button>
            </div>
          )}

          {(status === 'ended' || status === 'declined' || status === 'missed') && (
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-white/10 rounded-lg text-sm font-semibold text-white hover:bg-white/20 transition"
            >
              Close
            </button>
          )}
        </div>
      )}

      {/* Connected state overlay (controls + info) */}
      {isConnected && (
        <>
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-10 p-6 bg-gradient-to-b from-black/50 to-transparent">
            <div className="flex items-center gap-3">
              <img src={avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
              <div>
                <p className="text-sm font-semibold text-white">{other.username}</p>
                <p className="text-xs text-white/60 tabular-nums">{formatTimer(duration)}</p>
              </div>
            </div>
          </div>

          {/* Local video PiP */}
          {isVideo && (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute top-20 right-4 z-10 w-28 h-40 sm:w-36 sm:h-52 rounded-xl object-cover border-2 border-white/20 shadow-lg"
            />
          )}

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-8 pb-10 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex items-center justify-center gap-5">
              <button
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 ${muted ? 'bg-white text-[#0b141a]' : 'bg-white/15 text-white hover:bg-white/25'}`}
              >
                {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {isVideo && (
                <button
                  onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 ${!videoOn ? 'bg-white text-[#0b141a]' : 'bg-white/15 text-white hover:bg-white/25'}`}
                >
                  {videoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              )}

              <button
                onClick={handleEnd}
                className="w-16 h-16 rounded-full bg-[#ed4956] flex items-center justify-center transition active:scale-90 hover:bg-[#c43849]"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute bottom-24 left-0 right-0 text-center px-6">
          <p className="text-sm text-[#ed4956] bg-black/40 rounded-lg px-4 py-2 inline-block">{error}</p>
        </div>
      )}
    </div>
  );
}
