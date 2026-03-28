import { 
  RTCPeerConnection, 
  RTCIceCandidate, 
  RTCSessionDescription,
  mediaDevices 
} from 'react-native-webrtc';

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

export const createPeerConnection = () => {
  return new RTCPeerConnection(configuration);
};

export const getLocalStream = async () => {
  return await mediaDevices.getUserMedia({
    audio: true,
    video: true
  });
};