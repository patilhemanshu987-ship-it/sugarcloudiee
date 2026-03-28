import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import { createPeerConnection, getLocalStream } from '../services/webrtc';
import { supabase } from '../services/supabase';
import RNFetchBlob from 'react-native-blob-util';

type UseWebRTCProps = {
  connectionId: string;
  isInitiator: boolean;
  onMessageReceived: (data: string) => void;
};

export const useWebRTC = ({ connectionId, isInitiator, onMessageReceived }: UseWebRTCProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const peerConnection = useRef<any>(null);
  const dataChannel = useRef<any>(null);
  const localStream = useRef<any>(null);
  const subscriptionRef = useRef<any>(null);
  const hasHandledOfferRef = useRef(false);
  const hasHandledAnswerRef = useRef(false);
  const remoteDescriptionSetRef = useRef(false);
  const pendingCandidatesRef = useRef<any[]>([]);

  // Setup WebRTC
  useEffect(() => {
    setupWebRTC();
    return () => {
      if (localStream.current) {
        localStream.current.getTracks().forEach((track: any) => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  const attachDataChannel = useCallback((channel: any) => {
    dataChannel.current = channel;
    dataChannel.current.onopen = () => {
      console.log('Data channel open');
      setIsConnected(true);
      setIsLoading(false);
    };
    dataChannel.current.onmessage = (event: any) => {
      onMessageReceived(event.data);
    };
  }, [onMessageReceived]);

  const flushPendingCandidates = useCallback(async () => {
    if (!peerConnection.current || !remoteDescriptionSetRef.current) return;
    const queued = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const candidate of queued) {
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const loadExistingSignals = useCallback(async () => {
    if (!connectionId) return;

    if (!isInitiator) {
      const { data: latestOffer } = await supabase
        .from('webrtc_signals')
        .select('signal')
        .eq('connection_id', connectionId)
        .eq('type', 'offer')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestOffer?.signal && !hasHandledOfferRef.current) {
        await handleOffer(latestOffer.signal);
      }
    }

    const { data: existingCandidates } = await supabase
      .from('webrtc_signals')
      .select('signal')
      .eq('connection_id', connectionId)
      .eq('type', 'candidate')
      .limit(25);

    for (const row of existingCandidates || []) {
      await handleCandidate(row.signal);
    }
  }, [connectionId, isInitiator]);

  const setupWebRTC = useCallback(async () => {
    try {
      localStream.current = await getLocalStream();
      peerConnection.current = createPeerConnection();

      peerConnection.current.ondatachannel = (event: any) => {
        attachDataChannel(event.channel);
      };

      if (isInitiator) {
        const channel = peerConnection.current.createDataChannel('chat');
        attachDataChannel(channel);
      }

      peerConnection.current.onicecandidate = (event: any) => {
        if (event.candidate) {
          sendCandidate(event.candidate);
        }
      };

      if (!connectionId) throw new Error('Missing connection code');

      listenForSignals();
      await loadExistingSignals();

      if (isInitiator) {
        await createOffer();
      }

      // Do not block chat UI waiting for peer data channel to open.
      setIsLoading(false);

    } catch (error) {
      console.error('WebRTC setup error:', error);
      Alert.alert('Error', 'Failed to setup connection');
      setIsLoading(false);
    }
  }, [connectionId, isInitiator, attachDataChannel, loadExistingSignals]);

  const createOffer = useCallback(async () => {
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    await supabase.from('webrtc_signals').insert([{
      connection_id: connectionId,
      type: 'offer',
      signal: offer,
    }]);
  }, [connectionId]);

  const listenForSignals = useCallback(() => {
    const subscription = supabase
      .channel('webrtc_signals')
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `connection_id=eq.${connectionId}`,
        },
        async (payload: any) => {
          if (payload.new.connection_id !== connectionId) return;
          try {
            if (payload.new.type === 'offer' && !isInitiator) {
              await handleOffer(payload.new.signal);
            } else if (payload.new.type === 'answer' && isInitiator) {
              await handleAnswer(payload.new.signal);
            } else if (payload.new.type === 'candidate') {
              await handleCandidate(payload.new.signal);
            }
          } catch (err) {
            console.error('Signal handling error:', err);
          }
        }
      )
      .subscribe();
    subscriptionRef.current = subscription;
  }, [connectionId, isInitiator]);

  const handleOffer = useCallback(async (offer: any) => {
    if (hasHandledOfferRef.current) return;
    hasHandledOfferRef.current = true;
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
    remoteDescriptionSetRef.current = true;
    await flushPendingCandidates();
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);
    await supabase.from('webrtc_signals').insert([{
      connection_id: connectionId,
      type: 'answer',
      signal: answer,
    }]);
  }, [connectionId, flushPendingCandidates]);

  const handleAnswer = useCallback(async (answer: any) => {
    if (hasHandledAnswerRef.current) return;
    hasHandledAnswerRef.current = true;
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    remoteDescriptionSetRef.current = true;
    await flushPendingCandidates();
  }, [flushPendingCandidates]);

  const handleCandidate = useCallback(async (candidate: any) => {
    if (!remoteDescriptionSetRef.current) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }
    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
  }, []);

  const sendCandidate = useCallback(async (candidate: any) => {
    await supabase.from('webrtc_signals').insert([{
      connection_id: connectionId,
      type: 'candidate',
      signal: candidate,
    }]);
  }, [connectionId]);

  const sendMessage = useCallback((text: string) => {
    if (!dataChannel.current || dataChannel.current.readyState !== 'open') {
      Alert.alert('Error', 'Not connected to peer');
      return false;
    }
    dataChannel.current.send(text);
    return true;
  }, []);

  const sendGif = useCallback((url: string) => {
    if (!dataChannel.current || dataChannel.current.readyState !== 'open') {
      Alert.alert('Error', 'Not connected to peer');
      return false;
    }
    dataChannel.current.send(`GIF:${url}`);
    return true;
  }, []);

  const sendPhoto = useCallback(async (uri: string) => {
    try {
      setUploading(true);
      const fileName = `${Date.now()}.jpg`;
      const base64 = await RNFetchBlob.fs.readFile(uri, 'base64');
      const decoded = RNFetchBlob.base64.decode(base64);
      const arrayBuffer = new Uint8Array(
        decoded.split('').map(char => char.charCodeAt(0))
      );
      
      const { error } = await supabase.storage
        .from('chat-storage')
        .upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-storage')
        .getPublicUrl(fileName);

      if (dataChannel.current?.readyState === 'open') {
        dataChannel.current.send(`PHOTO:${publicUrl}`);
      }

      setUploading(false);
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
      Alert.alert('Error', 'Failed to upload photo');
      return null;
    }
  }, []);

  return {
    isConnected,
    isLoading,
    uploading,
    dataChannel: dataChannel.current,
    sendMessage,
    sendGif,
    sendPhoto,
  };
};