import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type CallType = 'voice' | 'video';
export type CallStatus = 'outgoing' | 'incoming' | 'connected' | 'ended' | 'missed' | 'declined';

export type CallSignal =
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; candidate: RTCIceCandidateInit }
  | { type: 'accept' }
  | { type: 'decline' }
  | { type: 'end' };

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export type CallHandlers = {
  onStatusChange: (status: CallStatus) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onLocalStream: (stream: MediaStream) => void;
};

export class WebRTCCall {
  private pc: RTCPeerConnection | null = null;
  private channel: RealtimeChannel | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private handlers: CallHandlers;
  private conversationId: string;
  private myId: string;
  private otherId: string;
  private callType: CallType;
  private isInitiator: boolean;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private ended = false;

  constructor(params: {
    conversationId: string;
    myId: string;
    otherId: string;
    callType: CallType;
    isInitiator: boolean;
    handlers: CallHandlers;
  }) {
    this.conversationId = params.conversationId;
    this.myId = params.myId;
    this.otherId = params.otherId;
    this.callType = params.callType;
    this.isInitiator = params.isInitiator;
    this.handlers = params.handlers;
  }

  async start(): Promise<void> {
    this.setupSignaling();
    if (this.isInitiator) {
      // Initiator: get media + create PC, but DON'T send the offer yet.
      // Wait for the receiver to send 'accept' after they pick up.
      await this.getUserMedia();
      this.createPeerConnection();
      await this.createOffer();
      this.handlers.onStatusChange('outgoing');
    } else {
      // Receiver: just listen for signals. The offer will arrive after we send 'accept'.
      this.handlers.onStatusChange('incoming');
    }
  }

  private setupSignaling() {
    this.channel = supabase.channel(`call:${this.conversationId}`, {
      config: { presence: { key: this.myId } },
    });

    this.channel
      .on('broadcast', { event: 'signal' }, (msg: { payload: { from: string; signal: CallSignal } }) => {
        if (msg.payload?.from !== this.otherId) return;
        this.handleSignal(msg.payload.signal);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.channel!.track({ userId: this.myId });
        }
      });
  }

  private async handleSignal(signal: CallSignal) {
    if (this.ended) return;

    if (signal.type === 'accept') {
      // Receiver accepted — initiator sends the offer now.
      if (this.isInitiator && this.pc) {
        this.sendSignal({ type: 'offer', sdp: this.pc.localDescription! });
      }
      return;
    }

    if (signal.type === 'offer') {
      if (!this.pc) {
        await this.getUserMedia();
        this.createPeerConnection();
      }
      try {
        await this.pc!.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        // Flush any buffered ICE candidates
        for (const c of this.pendingCandidates) {
          try { await this.pc!.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
        this.pendingCandidates = [];

        const answer = await this.pc!.createAnswer();
        await this.pc!.setLocalDescription(answer);
        this.sendSignal({ type: 'answer', sdp: answer });
        this.handlers.onStatusChange('connected');
      } catch (e) {
        console.error('Error handling offer:', e);
      }
    } else if (signal.type === 'answer') {
      if (!this.pc) return;
      try {
        await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        for (const c of this.pendingCandidates) {
          try { await this.pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
        this.pendingCandidates = [];
        this.handlers.onStatusChange('connected');
      } catch (e) {
        console.error('Error handling answer:', e);
      }
    } else if (signal.type === 'ice') {
      if (!this.pc || !this.pc.remoteDescription) {
        this.pendingCandidates.push(signal.candidate);
        return;
      }
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } catch (e) {
        console.error('ICE error:', e);
      }
    } else if (signal.type === 'decline') {
      this.handlers.onStatusChange('declined');
      this.cleanup();
    } else if (signal.type === 'end') {
      this.handlers.onStatusChange('ended');
      this.cleanup();
    }
  }

  private sendSignal(signal: CallSignal) {
    this.channel?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { from: this.myId, signal },
    });
  }

  private async getUserMedia(): Promise<void> {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: this.callType === 'video',
    };
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.handlers.onLocalStream(this.localStream);
  }

  private createPeerConnection() {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.localStream?.getTracks().forEach((track) => {
      this.pc!.addTrack(track, this.localStream!);
    });

    this.remoteStream = new MediaStream();

    this.pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((track) => {
        this.remoteStream!.addTrack(track);
      });
      this.handlers.onRemoteStream(this.remoteStream!);
    };

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.sendSignal({ type: 'ice', candidate: e.candidate.toJSON() });
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc?.connectionState === 'disconnected' || this.pc?.connectionState === 'failed') {
        this.handlers.onStatusChange('ended');
        this.cleanup();
      }
    };
  }

  private async createOffer(): Promise<void> {
    if (!this.pc) return;
    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      // Don't send yet — wait for 'accept' from receiver
    } catch (e) {
      console.error('Error creating offer:', e);
    }
  }

  async accept(): Promise<void> {
    // Receiver clicked accept — tell the initiator to send the offer.
    this.sendSignal({ type: 'accept' });
  }

  decline(): void {
    this.sendSignal({ type: 'decline' });
    this.handlers.onStatusChange('declined');
    this.cleanup();
  }

  end(): void {
    this.sendSignal({ type: 'end' });
    this.handlers.onStatusChange('ended');
    this.cleanup();
  }

  toggleMute(muted: boolean): void {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  toggleVideo(enabled: boolean): void {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }

  private cleanup() {
    if (this.ended) return;
    this.ended = true;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.remoteStream?.getTracks().forEach((t) => t.stop());
    this.pc?.close();
    this.pc = null;
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  destroy() {
    this.cleanup();
  }
}

export function subscribeToIncomingCalls(
  conversationId: string,
  myId: string,
  onIncoming: (from: string, callType: CallType) => void,
): RealtimeChannel {
  const channel = supabase.channel(`call-invite:${conversationId}`);
  channel
    .on('broadcast', { event: 'call' }, (msg: { payload: { from: string; type: CallType } }) => {
      if (msg.payload?.from && msg.payload.from !== myId) {
        onIncoming(msg.payload.from, msg.payload.type);
      }
    })
    .subscribe();
  return channel;
}

export function sendCallInvite(conversationId: string, myId: string, callType: CallType) {
  const channel = supabase.channel(`call-invite:${conversationId}`);
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channel.send({
        type: 'broadcast',
        event: 'call',
        payload: { from: myId, type: callType },
      });
    }
  });
  return channel;
}
