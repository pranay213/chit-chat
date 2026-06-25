import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Dimensions, 
  Platform, 
  Animated,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  mediaDevices,
} from 'react-native-webrtc';

const { width, height } = Dimensions.get('window');

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function CallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, token } = useAuth();
  
  const chatId = params.chatId as string;
  const initialType = (params.type as 'audio' | 'video') || 'audio';
  const callerName = (params.callerName as string) || 'Chat Contact';
  const receiverId = params.receiverId as string;
  const isIncoming = params.isIncoming === 'true';

  const [callType, setCallType] = useState<'audio' | 'video'>(initialType);
  const [callState, setCallState] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>('connecting');
  const [timer, setTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(initialType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pc = useRef<RTCPeerConnection | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    initWebRTC();
    return () => {
      cleanup();
    };
  }, []);

  const initWebRTC = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video' ? { facingMode: 'user' } : false,
      });
      setLocalStream(stream);

      const socket = getSocket();
      if (!socket) return;

      pc.current = new RTCPeerConnection(ICE_SERVERS);
      
      stream.getTracks().forEach((track: any) => {
        pc.current?.addTrack(track, stream);
      });

      (pc.current as any).ontrack = (event: any) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setCallState('connected');
        }
      };

      (pc.current as any).onicecandidate = (event: any) => {
        if (event.candidate) {
          socket.emit('webrtcIceCandidate', {
            to: receiverId,
            candidate: event.candidate,
          });
        }
      };

      if (!isIncoming) {
        // We are the caller
        setCallState('ringing');
        const offer = await pc.current.createOffer({});
        await pc.current.setLocalDescription(offer);
        socket.emit('callUser', {
          userToCall: receiverId,
          signalData: offer,
          from: user?._id,
          name: user?.displayName || 'User',
        });
      } else {
        // We are the receiver
        if (params.signal) {
          const offer = JSON.parse(params.signal as string);
          await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.current.createAnswer();
          await pc.current.setLocalDescription(answer);
          socket.emit('answerCall', {
            to: receiverId,
            signal: answer,
          });
          setCallState('connected');
        }
      }

      socket.on('callAccepted', async (signal: any) => {
        if (pc.current && !pc.current.remoteDescription) {
          await pc.current.setRemoteDescription(new RTCSessionDescription(signal));
          setCallState('connected');
        }
      });

      socket.on('webrtcIceCandidate', async (data: any) => {
        if (pc.current) {
          await pc.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });

      socket.on('callRejected', () => {
        handleEndCall('rejected');
      });

      socket.on('callEnded', () => {
        handleEndCall('ended');
      });

    } catch (err) {
      console.error('WebRTC Init Error', err);
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const handleEndCall = (status = 'ended') => {
    setCallState('ended');
    cleanup();
    const socket = getSocket();
    if (socket) {
      socket.emit('endCall', { to: receiverId });
    }
    if (token) {
      api.createCallLog(token, {
        receiverId,
        chatId: chatId,
        type: callType,
        status: (timer > 0 ? 'completed' : status) as 'missed' | 'rejected' | 'completed',
        duration: timer
      }).catch(err => console.log('Error log', err));
    }
    router.back();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={styles.statusText}>
          {callState === 'ringing' ? 'Ringing...' : 
           callState === 'connecting' ? 'Connecting...' : 
           callState === 'ended' ? 'Call Ended' : formatTimer(timer)}
        </Text>
      </View>

      {/* Video Feeds */}
      {callType === 'video' && (
        <View style={styles.videoContainer}>
          {remoteStream ? (
            <RTCView 
              streamURL={remoteStream.toURL()} 
              style={styles.remoteVideo}
              objectFit="cover"
            />
          ) : (
            <View style={styles.remoteVideoPlaceholder}>
              <ActivityIndicator size="large" color="#FFF" />
            </View>
          )}

          {localStream && isVideoOn && (
            <RTCView 
              streamURL={localStream.toURL()} 
              style={styles.localVideo}
              objectFit="cover"
              zOrder={1}
            />
          )}
        </View>
      )}

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlRow}>
          <TouchableOpacity style={[styles.controlBtn, isMuted && styles.controlBtnActive]} onPress={toggleMute}>
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color={isMuted ? "#333" : "#FFF"} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.controlBtn, !isVideoOn && styles.controlBtnActive]} onPress={toggleVideo}>
            <Ionicons name={isVideoOn ? "videocam" : "videocam-off"} size={28} color={!isVideoOn ? "#333" : "#FFF"} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlBtn, styles.endCallBtn]} onPress={() => handleEndCall('ended')}>
            <Ionicons name="call" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    zIndex: 10,
  },
  callerName: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 16,
    color: '#AAA',
    marginTop: 8,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    width: width,
    height: height,
  },
  remoteVideoPlaceholder: {
    flex: 1,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideo: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    paddingHorizontal: 30,
    zIndex: 10,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: '#FFF',
  },
  endCallBtn: {
    backgroundColor: '#E53935',
    width: 70,
    height: 70,
    borderRadius: 35,
  }
});
