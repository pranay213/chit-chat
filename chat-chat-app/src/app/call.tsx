import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  Platform, 
  Animated, 
  FlatList,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const { width, height } = Dimensions.get('window');

// Mock participants for simulation
const MOCK_PARTICIPANTS = [
  { id: '1', name: 'You', image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', isSpeaking: false, isMuted: false, isVideoOff: false },
  { id: '2', name: 'Priya Sharma', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', isSpeaking: true, isMuted: false, isVideoOff: false },
  { id: '3', name: 'Rohan Mehta', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', isSpeaking: false, isMuted: true, isVideoOff: false },
  { id: '4', name: 'Neha Singh', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', isSpeaking: false, isMuted: false, isVideoOff: true },
  { id: '5', name: 'Arjun Verma', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', isSpeaking: false, isMuted: false, isVideoOff: false },
  { id: '6', name: 'Sneha Kapoor', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', isSpeaking: false, isMuted: true, isVideoOff: false },
];

export default function CallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, token } = useAuth();
  
  const chatId = params.chatId as string;
  const initialType = (params.type as 'audio' | 'video') || 'audio';
  const callerName = (params.callerName as string) || 'Chat Contact';
  const callerAvatar = params.callerAvatar as string;
  const isGroup = params.isGroup === 'true';
  const receiverId = params.receiverId as string;

  const [callType, setCallType] = useState<'audio' | 'video'>(initialType);
  const [callState, setCallState] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>('connecting');
  const [timer, setTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(initialType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('grid');
  
  // Animation refs
  const rippleAnim1 = useRef(new Animated.Value(0)).current;
  const rippleAnim2 = useRef(new Animated.Value(0)).current;
  
  const timerRef = useRef<any>(null);

  // Simulated active call start
  useEffect(() => {
    const connTimeout = setTimeout(() => {
      setCallState('connected');
    }, 2000);

    return () => clearTimeout(connTimeout);
  }, []);

  // Timer increment
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

  // Waveform ripple animations for audio call
  useEffect(() => {
    if (callType === 'audio') {
      const animateRipple = (anim: Animated.Value, delay: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true
            })
          ])
        ).start();
      };
      
      animateRipple(rippleAnim1, 0);
      animateRipple(rippleAnim2, 1000);
    }
  }, [callType]);

  const handleEndCall = () => {
    setCallState('ended');
    const socket = getSocket();
    if (socket) {
      socket.emit('endCall', { to: chatId });
    }

    if (token) {
      // Use receiverId or fallback if group call
      const activeReceiverId = receiverId || '6a3c2f489c0564e9bffd3106';
      api.createCallLog(token, {
        receiverId: activeReceiverId,
        chatId: chatId,
        type: callType,
        status: timer > 0 ? 'completed' : 'missed',
        duration: timer
      }).catch(err => console.log('Error creating call log:', err));
    }

    setTimeout(() => {
      router.back();
    }, 1000);
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const getParticipantsList = () => {
    if (isGroup) {
      return MOCK_PARTICIPANTS;
    }
    // For single chats, just you and the caller
    return [
      { id: '1', name: 'You', image: user?.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', isSpeaking: false, isMuted: false, isVideoOff: !isVideoOn },
      { id: '2', name: callerName, image: callerAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', isSpeaking: true, isMuted: isMuted, isVideoOff: false },
    ];
  };

  const renderAudioCall = () => {
    const scale1 = rippleAnim1.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.2]
    });
    const opacity1 = rippleAnim1.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 0]
    });

    const scale2 = rippleAnim2.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.2]
    });
    const opacity2 = rippleAnim2.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 0]
    });

    return (
      <View style={styles.audioContainer}>
        {/* Circle Ripple Waveform Visualizer */}
        <View style={styles.rippleOuterContainer}>
          <Animated.View style={[styles.ripple, { transform: [{ scale: scale1 }], opacity: opacity1 }]} />
          <Animated.View style={[styles.ripple, { transform: [{ scale: scale2 }], opacity: opacity2 }]} />
          
          <View style={styles.mainAvatarWrapper}>
            {callerAvatar ? (
              <Image source={{ uri: callerAvatar }} style={styles.mainAvatar} />
            ) : (
              <View style={[styles.mainAvatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={60} color="#FFF" />
              </View>
            )}
          </View>
        </View>

        {isGroup && (
          <View style={styles.groupParticipantsWrapper}>
            {MOCK_PARTICIPANTS.slice(1, 6).map((p, idx) => (
              <View 
                key={p.id} 
                style={[
                  styles.miniAvatarContainer, 
                  { 
                    transform: [
                      { rotate: `${(idx * 72)}deg` },
                      { translateY: -85 },
                      { rotate: `-${(idx * 72)}deg` }
                    ] 
                  }
                ]}
              >
                <Image source={{ uri: p.image }} style={styles.miniAvatar} />
                {p.isSpeaking && <View style={styles.speakingIndicatorRing} />}
              </View>
            ))}
          </View>
        )}

        <Text style={styles.cryptoBadge}>🔒 End-to-end Encrypted</Text>
      </View>
    );
  };

  const renderVideoCall = () => {
    const participants = getParticipantsList();

    if (viewMode === 'speaker' || !isGroup) {
      // Speaker View or Single Video Call
      const activeSpeaker = participants.find(p => p.id !== '1') || participants[0];
      const localUser = participants.find(p => p.id === '1');

      return (
        <View style={styles.speakerViewContainer}>
          {/* Main active speaker video */}
          <View style={styles.mainSpeakerFeed}>
            {activeSpeaker.isVideoOff ? (
              <View style={styles.videoOffFallback}>
                <Image source={{ uri: activeSpeaker.image }} style={styles.fallbackAvatar} />
                <Text style={styles.fallbackText}>{activeSpeaker.name}'s camera is off</Text>
              </View>
            ) : (
              <Image source={{ uri: activeSpeaker.image }} style={styles.speakerVideoImage} resizeMode="cover" />
            )}
            <View style={styles.badgeContainer}>
              <Text style={styles.participantNameBadge}>{activeSpeaker.name}</Text>
              {activeSpeaker.isMuted && (
                <View style={styles.mutedBadge}>
                  <Ionicons name="mic-off" size={14} color="#FFF" />
                </View>
              )}
            </View>
          </View>

          {/* Local User Mini Floating Window */}
          {localUser && (
            <View style={styles.floatingLocalFeed}>
              {isVideoOn ? (
                <Image source={{ uri: localUser.image }} style={styles.floatingLocalImage} />
              ) : (
                <View style={styles.floatingLocalFallback}>
                  <Ionicons name="videocam-off" size={18} color="#FFF" />
                </View>
              )}
              <Text style={styles.floatingLocalName}>You</Text>
            </View>
          )}

          {/* Top horizontal row of other participants (if group) */}
          {isGroup && (
            <View style={styles.topParticipantRow}>
              <FlatList
                horizontal
                data={participants.filter(p => p.id !== activeSpeaker.id && p.id !== '1')}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={styles.miniCard}>
                    <Image source={{ uri: item.image }} style={styles.miniCardImage} />
                    <View style={styles.miniCardOverlay}>
                      <Text style={styles.miniCardName} numberOfLines={1}>{item.name}</Text>
                    </View>
                  </View>
                )}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}
        </View>
      );
    }

    // Grid View for Group Call
    return (
      <View style={styles.gridViewContainer}>
        <View style={styles.grid}>
          {participants.map((p) => (
            <View key={p.id} style={styles.gridCell}>
              {p.isVideoOff || (p.id === '1' && !isVideoOn) ? (
                <View style={styles.gridFallback}>
                  <Image source={{ uri: p.image }} style={styles.gridFallbackAvatar} />
                  <Text style={styles.gridFallbackText}>{p.name}</Text>
                </View>
              ) : (
                <Image source={{ uri: p.image }} style={styles.gridVideoImage} />
              )}
              
              <View style={styles.gridBadgeContainer}>
                <Text style={styles.gridNameBadge}>{p.name}</Text>
                {p.isMuted && (
                  <View style={styles.gridMutedBadge}>
                    <Ionicons name="mic-off" size={12} color="#FFF" />
                  </View>
                )}
              </View>
              
              {p.isSpeaking && <View style={styles.gridSpeakingOutline} />}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Dark background for premium look */}
      <View style={styles.darkBackgroundOverlay} />

      {/* Header Info */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={28} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.callMeta}>
          <Text style={styles.callerNameText}>
            {isGroup ? `${callerName} Group` : callerName}
          </Text>
          <Text style={styles.callStatusText}>
            {callState === 'connecting' ? 'Connecting...' : 
             callState === 'ringing' ? 'Ringing...' : 
             callState === 'ended' ? 'Call Ended' : formatTimer(timer)}
          </Text>
        </View>

        {callType === 'video' && isGroup ? (
          <TouchableOpacity 
            onPress={() => setViewMode(prev => prev === 'grid' ? 'speaker' : 'grid')} 
            style={styles.headerBtn}
          >
            <Ionicons name={viewMode === 'grid' ? 'list' : 'grid'} size={24} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Main Calling Content View */}
      <View style={styles.contentArea}>
        {callType === 'audio' ? renderAudioCall() : renderVideoCall()}
      </View>

      {/* Interactive Controls Bar */}
      <View style={styles.controlsBar}>
        {/* Toggle Mute */}
        <TouchableOpacity 
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]} 
          onPress={() => setIsMuted(prev => !prev)}
        >
          <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color={isMuted ? "#FFF" : "#FFF"} />
          <Text style={styles.controlBtnLabel}>Mute</Text>
        </TouchableOpacity>

        {/* Toggle Video/Camera */}
        <TouchableOpacity 
          style={[styles.controlBtn, !isVideoOn && styles.controlBtnActive]} 
          onPress={() => {
            setIsVideoOn(prev => !prev);
            if (callType === 'audio') {
              setCallType('video');
              setIsVideoOn(true);
            }
          }}
        >
          <Ionicons name={isVideoOn ? "videocam" : "videocam-off"} size={24} color="#FFF" />
          <Text style={styles.controlBtnLabel}>{isVideoOn ? "Stop Video" : "Start Video"}</Text>
        </TouchableOpacity>

        {/* Toggle Speaker/Audio Route */}
        <TouchableOpacity 
          style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]} 
          onPress={() => setIsSpeakerOn(prev => !prev)}
        >
          <Ionicons name={isSpeakerOn ? "volume-high" : "volume-medium"} size={24} color="#FFF" />
          <Text style={styles.controlBtnLabel}>Speaker</Text>
        </TouchableOpacity>

        {/* Toggle Audio / Video Mode */}
        <TouchableOpacity 
          style={styles.controlBtn} 
          onPress={() => {
            setCallType(prev => prev === 'audio' ? 'video' : 'audio');
            setIsVideoOn(callType === 'audio');
          }}
        >
          <Ionicons name={callType === 'audio' ? "videocam" : "call"} size={24} color="#FFF" />
          <Text style={styles.controlBtnLabel}>{callType === 'audio' ? "Video" : "Audio"}</Text>
        </TouchableOpacity>

        {/* End Call Button */}
        <TouchableOpacity 
          style={[styles.controlBtn, styles.endCallBtn]} 
          onPress={handleEndCall}
        >
          <Ionicons name="call" size={26} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
          <Text style={styles.controlBtnLabel}>End</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1C18', // Deep forest/metallic dark green theme
  },
  darkBackgroundOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callMeta: {
    alignItems: 'center',
  },
  callerNameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  callStatusText: {
    fontSize: 14,
    color: '#00E676', // Vibrant call-connected green
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Audio Call UI styles
  audioContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  rippleOuterContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  ripple: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
  },
  mainAvatarWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: '#00E676',
    overflow: 'hidden',
    backgroundColor: '#333',
    zIndex: 2,
  },
  mainAvatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7E57C2',
  },
  groupParticipantsWrapper: {
    position: 'absolute',
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarContainer: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFF',
    overflow: 'hidden',
  },
  miniAvatar: {
    width: '100%',
    height: '100%',
  },
  speakingIndicatorRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#00E676',
  },
  cryptoBadge: {
    fontSize: 12,
    color: '#888',
    marginTop: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },

  // Video Call UI styles
  speakerViewContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  mainSpeakerFeed: {
    flex: 1,
    width: '100%',
    backgroundColor: '#222',
    overflow: 'hidden',
  },
  speakerVideoImage: {
    width: '100%',
    height: '100%',
  },
  videoOffFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E2F2B',
  },
  fallbackAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fallbackText: {
    color: '#AAA',
    fontSize: 14,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8,
  },
  participantNameBadge: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  mutedBadge: {
    backgroundColor: '#E53935',
    borderRadius: 8,
    padding: 2,
  },
  floatingLocalFeed: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 110,
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFF',
    overflow: 'hidden',
    backgroundColor: '#333',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  floatingLocalImage: {
    width: '100%',
    height: '100%',
  },
  floatingLocalFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C312C',
  },
  floatingLocalName: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  topParticipantRow: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 140,
    height: 90,
  },
  miniCard: {
    width: 70,
    height: 90,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  miniCardImage: {
    width: '100%',
    height: '100%',
  },
  miniCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  miniCardName: {
    color: '#FFF',
    fontSize: 10,
  },

  // Grid View styles
  gridViewContainer: {
    flex: 1,
    width: '100%',
    padding: 8,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'stretch',
  },
  gridCell: {
    width: '48%',
    height: '31%',
    backgroundColor: '#1E2F2B',
    borderRadius: 12,
    marginBottom: '4%',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gridVideoImage: {
    width: '100%',
    height: '100%',
  },
  gridFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridFallbackAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  gridFallbackText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  gridBadgeContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  gridNameBadge: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  gridMutedBadge: {
    backgroundColor: '#E53935',
    borderRadius: 6,
    padding: 1.5,
  },
  gridSpeakingOutline: {
    ...StyleSheet.absoluteFill,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#00E676',
  },

  // Controls bar
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 28, 24, 0.95)',
    paddingVertical: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  controlBtn: {
    alignItems: 'center',
    gap: 6,
  },
  controlBtnActive: {
    opacity: 0.5,
  },
  controlBtnLabel: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '500',
  },
  endCallBtn: {
    backgroundColor: '#FF3B30',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
