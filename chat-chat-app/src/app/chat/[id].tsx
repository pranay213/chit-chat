import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  ImageBackground,
  Animated,
  Alert,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import EmojiPicker from 'rn-emoji-keyboard';
// import { Audio } from 'expo-av';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import AudioRecorder from '../../components/AudioRecorder';
import MediaRecorder from '../../components/MediaRecorder';
import FileViewer from '../../components/FileViewer';
// @ts-ignore
import { Map, Camera, Marker, UserLocation, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import * as Location from 'expo-location';
import { startLocationSharing, stopLocationSharing, isSharingLocation } from '../../services/location';
import LocationPicker from '../../components/LocationPicker';

const whatsappWallpaper = require('../../../assets/images/whatsapp_wallpaper.png');

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap Contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 22 }],
};

const VideoMessagePlayer = ({ url }: { url: string }) => {
  const player = useVideoPlayer(url, player => {
    player.loop = false;
  });

  return (
    <VideoView
      style={{ width: 280, height: 210, borderRadius: 8, backgroundColor: '#000' }}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
    />
  );
};

const AudioMessagePlayer = ({ url, isMe }: { url: string, isMe: boolean }) => {
  const player = useAudioPlayer(url);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity onPress={() => player.playing ? player.pause() : player.play()}>
        <Ionicons name={player.playing ? "pause-circle" : "play-circle"} size={36} color={isMe ? "#FFF" : "#7E57C2"} />
      </TouchableOpacity>
      <Text style={{ marginLeft: 8, color: isMe ? "#FFF" : "#333", fontStyle: 'italic' }}>
        {player.playing ? "Playing..." : "Voice Message"}
      </Text>
    </View>
  );
};

interface Message {
  _id: string;
  chatId: string;
  senderId: {
    _id: string;
    displayName: string;
    profileImage?: string;
  };
  text?: string;
  attachments?: Array<{
    name: string;
    size?: string;
    type?: string;
  }>;
  createdAt: string;
}

const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (val: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true
          })
        ])
      );
    };

    const anim1 = animate(dot1, 0);
    const anim2 = animate(dot2, 150);
    const anim3 = animate(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  const getStyle = (val: Animated.Value) => ({
    transform: [{
      translateY: val.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -6]
      })
    }],
    opacity: val.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1]
    })
  });

  return (
    <View style={styles.typingDotsRow}>
      <Animated.View style={[styles.typingDot, getStyle(dot1)]} />
      <Animated.View style={[styles.typingDot, getStyle(dot2)]} />
      <Animated.View style={[styles.typingDot, getStyle(dot3)]} />
    </View>
  );
};

const MessageSkeleton = () => {
  const animatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [animatedValue]);

  return (
    <View style={{ padding: 16, width: '100%', gap: 16 }}>
      {[...Array(6)].map((_, i) => (
        <View key={i} style={{
          alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start',
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 8,
          opacity: i > 3 ? 0.5 : 1
        }}>
          {i % 2 !== 0 && (
            <Animated.View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', opacity: animatedValue }} />
          )}
          <Animated.View style={{ 
            width: i % 3 === 0 ? 120 : i % 2 === 0 ? 200 : 160, 
            height: 40, 
            borderRadius: 16, 
            backgroundColor: '#E0E0E0', 
            opacity: animatedValue 
          }} />
        </View>
      ))}
    </View>
  );
};

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id: chatId, chatName, chatAvatar, isGroup: isGroupParam, isOnline: isOnlineParam, receiverId } = params;
  
  const isGroup = isGroupParam === 'true';
  const isOnline = isOnlineParam === 'true';

  const { user, token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showMediaRecorder, setShowMediaRecorder] = useState(false);
  const [sound, setSound] = useState<any | null>(null);
  const [typingUser, setTypingUser] = useState('');
  const [liveLocations, setLiveLocations] = useState<{ [userId: string]: { lat: number, lng: number } }>({});
  const [isSharingLiveLoc, setIsSharingLiveLoc] = useState(false);
  
  const [participants, setParticipants] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapModalCenter, setMapModalCenter] = useState<{lat: number, lng: number} | null>(null);
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const [routeDetails, setRouteDetails] = useState<{distance: string, duration: string} | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [audioRecorderKey, setAudioRecorderKey] = useState(0);
  const modalCameraRef = useRef<any>(null);
  
  // Animation for pulsing map markers
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef<FlatList>(null);
  const hasRestoredScroll = useRef(false);
  const socket = getSocket();

  const handleScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    AsyncStorage.setItem(`scrollPos_${chatId}`, offsetY.toString());
  };

  useEffect(() => {
    if (isGroup && token && user) {
      api.getChats(user._id, token).then(res => {
        const chats = res.data?.data || res.data || [];
        const currentChat = chats.find((c: any) => c._id === chatId);
        if (currentChat && currentChat.participants) {
          setParticipants(currentChat.participants);
        }
      }).catch(err => console.log('Failed to fetch chat details for participants', err));
    }
  }, [isGroup, token, user, chatId]);

  useEffect(() => {
    if (isTyping) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [isTyping]);

  useEffect(() => {
    // Start pulsing animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true })
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (mapModalVisible && mapModalCenter) {
      (async () => {
        try {
          // Get current user location
          let currentLoc = liveLocations[user?._id || ''] || null;
          if (!currentLoc) {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Location.getCurrentPositionAsync({});
              currentLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
            }
          }

          if (currentLoc) {
            setMyLocation(currentLoc);
            // Fetch route from OSRM
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${currentLoc.lng},${currentLoc.lat};${mapModalCenter.lng},${mapModalCenter.lat}?overview=full&geometries=geojson`);
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              setRouteData(route.geometry);
              const distKm = (route.distance / 1000).toFixed(1);
              const durMin = Math.ceil(route.duration / 60);
              setRouteDetails({ distance: `${distKm} km`, duration: `${durMin} min` });
            }
          }
        } catch (err) {
          console.log("Routing error", err);
        }
      })();
    } else {
      setRouteData(null);
      setRouteDetails(null);
      setMyLocation(null);
    }
  }, [mapModalVisible, mapModalCenter]);

  const fetchMessages = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getMessages(chatId.toString(), token);
      const msgList = 
        res?.data?.data ||   // standard paginated shape
        res?.data ||         // flat array fallback
        res?.docs  ||        // mongoose paginator fallback
        [];
      setMessages(Array.isArray(msgList) ? msgList : []);
    } catch (err) {
      console.log('Error fetching messages from API:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Live-patchable header info (updated via socket when contact changes profile)
  const [headerName, setHeaderName] = useState(chatName as string || '');
  const [headerAvatar, setHeaderAvatar] = useState(chatAvatar as string || '');

  useEffect(() => {
    fetchMessages();

    const handleNewMessage = (msg: any) => {
      if (msg.chatId === chatId.toString()) {
        setMessages((prev: any) => [...prev, msg]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    if (socket) {
      // Join Room
      socket.emit('joinChat', chatId);

      socket.on('message', handleNewMessage);
        
      socket.on('typing', (data: any) => {
        if (data.chatId === chatId.toString() && data.userId !== user?._id) {
          setTypingUser(data.userId);
          setIsTyping(true);
        }
      });

      socket.on('stopTyping', (data: any) => {
        if (data.chatId === chatId.toString() && data.userId !== user?._id) {
          setIsTyping(false);
          setTypingUser('');
        }
      });

      socket.on('locationUpdate', (data: any) => {
        if (data.chatId === chatId.toString()) {
          setLiveLocations(prev => ({
            ...prev,
            [data.userId]: { lat: data.lat, lng: data.lng }
          }));
        }
      });

      socket.on('locationStopped', (data: any) => {
        if (data.chatId === chatId.toString()) {
          setLiveLocations(prev => {
            const newLocs = { ...prev };
            delete newLocs[data.userId];
            return newLocs;
          });
        }
      });

      socket.on('userProfileUpdated', (data: { userId: string; displayName?: string; profileImage?: string | null }) => {
        if (!isGroup && data.userId !== user?._id) {
          if (data.displayName) setHeaderName(data.displayName);
          if (data.profileImage !== undefined) setHeaderAvatar(data.profileImage || '');
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('message', handleNewMessage);
        socket.off('typing');
        socket.off('stopTyping');
        socket.off('locationUpdate');
        socket.off('locationStopped');
        socket.emit('leaveChat', chatId.toString());
      }
    };
  }, [socket, chatId, user]);

  useEffect(() => {
    setIsSharingLiveLoc(isSharingLocation(chatId.toString()));
  }, [chatId]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const textToSend = inputText;
    setInputText('');

    if (socket) {
      socket.emit('sendMessage', {
        chatId: chatId.toString(),
        text: textToSend,
      });

      socket.emit('stopTyping', chatId);
    } else {
      const newMsg: Message = {
        _id: Math.random().toString(),
        chatId: chatId.toString(),
        senderId: { _id: user?._id || 'current-user', displayName: user?.displayName || 'Me' },
        text: textToSend,
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleAttachMedia = () => {
    Alert.alert(
      'Attach Media',
      'Choose the type of media to send',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Photo Library', onPress: () => pickImage(false) },
        { text: 'Document', onPress: pickDocument },
        { text: isSharingLiveLoc ? '🔴 Stop Live Location' : '📍 Share Live Location', onPress: toggleLiveLocation },
      ]
    );
  };

  const toggleLiveLocation = async () => {
    if (isSharingLiveLoc) {
      // Stop sharing directly
      await stopLocationSharing(chatId.toString());
      setIsSharingLiveLoc(false);

      const stopMsg: Message = {
        _id: `local_loc_stop_${Date.now()}`,
        chatId: chatId.toString(),
        senderId: { _id: user?._id || '', displayName: user?.displayName || 'Me' },
        text: 'LOCATION_STOPPED:',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, stopMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      if (socket) {
        socket.emit('sendMessage', { chatId: chatId.toString(), text: 'LOCATION_STOPPED:' });
      }
    } else {
      // Open the picker instead of immediately sharing
      setShowLocationPicker(true);
    }
  };

  const handleLocationSelected = async (lat: number, lng: number, isLive: boolean, durationHours?: number) => {
    if (!user?._id) return;

    const processShare = async () => {
      try {
        if (isLive) {
          await startLocationSharing(chatId.toString(), user._id);
          setIsSharingLiveLoc(true);
        }

        const textPayload = isLive ? `LOCATION:${lat},${lng}:${durationHours || 0}` : `STATIC_LOCATION:${lat},${lng}`;

        const locMsg: Message = {
          _id: `local_loc_${Date.now()}`,
          chatId: chatId.toString(),
          senderId: { _id: user._id, displayName: user.displayName || 'Me' },
          text: textPayload,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, locMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        if (socket) {
          socket.emit('sendMessage', { chatId: chatId.toString(), text: textPayload });
        }
      } catch (e) {
        console.log('Error starting location share:', e);
      }
    };

    if (isLive && isSharingLiveLoc) {
      Alert.alert(
        "Already Sharing",
        "You are already sharing a live location. Do you want to stop the existing one and share this new one?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Yes, Replace", 
            style: "destructive",
            onPress: () => {
              // We could emit a stop message here if we wanted to gracefully end the old one in chat history
              // but startLocationSharing will overwrite the current live location in the backend/socket state anyway.
              processShare();
            }
          }
        ]
      );
    } else {
      processShare();
    }
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      const result = useCamera 
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        uploadAndSendMedia(result.assets[0].uri, 'image', result.assets[0].fileName || 'photo.jpg');
      }
    } catch (err) {
      console.log('Error picking image:', err);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (result.canceled === false && result.assets && result.assets[0].uri) {
        uploadAndSendMedia(result.assets[0].uri, 'file', result.assets[0].name);
      }
    } catch (err) {
      console.log('Error picking document:', err);
    }
  };

  const uploadAndSendMedia = async (uri: string, type: 'image' | 'file' | 'audio' | 'video', fileName: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const uploadRes = await api.uploadMedia(uri, token);
      const data = uploadRes.data || uploadRes;
      
      if (data.success && data.url) {
        if (socket) {
          socket.emit('sendMessage', {
            chatId: chatId.toString(),
            attachments: [{
              type,
              url: data.url,
              name: fileName,
            }]
          });
        }
      }
    } catch (err) {
      Alert.alert('Upload Failed', 'Failed to upload media file.');
    } finally {
      setLoading(false);
    }
  };

  const handleCamera = () => {
    setShowMediaRecorder(true);
  };

  const handleMediaCaptured = (uri: string, type: 'photo' | 'video') => {
    uploadAndSendMedia(uri, type === 'photo' ? 'image' : 'video', `capture.${type === 'photo' ? 'jpg' : 'mp4'}`);
  };

  const handleAudioSend = (uri: string) => {
    uploadAndSendMedia(uri, 'audio', 'voice-message.m4a');
    setAudioRecorderKey(prev => prev + 1);
  };

  const handleAudioCancel = () => {
    setAudioRecorderKey(prev => prev + 1);
  };

  const playSound = async (uri: string) => {
    if (sound) {
      await sound.unloadAsync();
    }
    // const { sound: newSound } = await Audio.Sound.createAsync({ uri });
    // setSound(newSound);
    // await newSound.playAsync();
    console.log('Audio playback temporarily disabled');
  };

  const handleTyping = (text: string) => {
    setInputText(text);

    if (isGroup) {
      const match = text.match(/@(\w*)$/);
      if (match) {
        setShowMentions(true);
        setMentionQuery(match[1].toLowerCase());
      } else {
        setShowMentions(false);
      }
    }

    if (!socket) return;
    if (text.length > 0) {
      socket.emit('typing', chatId);
    } else {
      socket.emit('stopTyping', chatId);
    }
  };

  const handleMentionSelect = (userToMention: any) => {
    const newText = inputText.replace(/@\w*$/, `@${userToMention.displayName} `);
    setInputText(newText);
    setShowMentions(false);
  };

  const formatMessageTime = (isoString: string) => {
    try {
      if (!isoString) return '';
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const getParticipantColor = (name: string) => {
    const colors = ['#E53935', '#1E88E5', '#43A047', '#D81B60', '#F4511E', '#7E57C2'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.profileBtn}>
              {headerAvatar ? (
                <Image source={{ uri: headerAvatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name={isGroup ? "people" : "person"} size={20} color="#FFF" />
                </View>
              )}
              <View style={styles.headerTitleContainer}>
                <Text style={styles.chatName} numberOfLines={1}>{headerName}</Text>
                <Text style={styles.chatStatus} numberOfLines={1}>
                  {isTyping ? `${typingUser} is typing...` : isGroup ? 'Group Chat' : isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={() => router.push({
                pathname: '/call',
                params: {
                  chatId: chatId.toString(),
                  type: 'video',
                  callerName: headerName,
                  callerAvatar: headerAvatar || '',
                  isGroup: isGroup ? 'true' : 'false',
                  receiverId: (receiverId as string) || ''
                }
              })}
            >
              <Ionicons name="videocam-outline" size={22} color="#333" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => router.push({
                pathname: '/call',
                params: {
                  chatId: chatId.toString(),
                  type: 'audio',
                  callerName: headerName,
                  callerAvatar: headerAvatar || '',
                  isGroup: isGroup ? 'true' : 'false',
                  receiverId: (receiverId as string) || ''
                }
              })}
            >
              <Ionicons name="call-outline" size={20} color="#333" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="ellipsis-vertical" size={20} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        <ImageBackground 
          source={whatsappWallpaper} 
          style={styles.chatContainer}
          resizeMode="cover"
        >
          {Object.keys(liveLocations).length > 0 && (
            <View style={{ height: 200, width: '100%', borderBottomWidth: 1, borderBottomColor: '#CCC' }}>
              <MapView 
                style={{ flex: 1 }}
                initialRegion={{
                  latitude: Object.values(liveLocations)[0].lat,
                  longitude: Object.values(liveLocations)[0].lng,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
              >
                {Object.entries(liveLocations).map(([uid, loc]) => (
                  <Marker
                    key={uid}
                    coordinate={{ latitude: loc.lat, longitude: loc.lng }}
                    title={uid === user?._id ? "Me" : "Participant"}
                    description="Live Location"
                    pinColor={uid === user?._id ? "blue" : "red"}
                  />
                ))}
              </MapView>
            </View>
          )}

          <View style={styles.wallpaperOverlay} />
          
          {loading ? (
            <MessageSkeleton />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item._id}
              contentContainerStyle={styles.messagesList}
              keyboardShouldPersistTaps="handled"
              onMomentumScrollEnd={handleScrollEnd}
              onScrollEndDrag={handleScrollEnd}
              onLayout={() => {
                if (hasRestoredScroll.current) return;
                hasRestoredScroll.current = true;
                setTimeout(async () => {
                  try {
                    const savedOffset = await AsyncStorage.getItem(`scrollPos_${chatId}`);
                    if (savedOffset !== null) {
                      flatListRef.current?.scrollToOffset({ offset: parseFloat(savedOffset), animated: false });
                    } else {
                      flatListRef.current?.scrollToEnd({ animated: false });
                    }
                  } catch (e) {
                    flatListRef.current?.scrollToEnd({ animated: false });
                  }
                }, 150);
              }}
              renderItem={({ item }) => {
                const isMe = item.senderId._id === 'current-user' || item.senderId._id === user?._id;

                // Render Location Share Message Card
                const isLocationMsg = item.text?.startsWith('LOCATION:');
                const isStaticLocationMsg = item.text?.startsWith('STATIC_LOCATION:');
                const isLocationStopped = item.text?.startsWith('LOCATION_STOPPED:');
                
                if (isLocationMsg || isStaticLocationMsg || isLocationStopped) {
                  let lat = 0, lng = 0, durationHours = 0;
                  if (isLocationMsg) {
                    const parts = item.text!.substring(9).split(':');
                    const coords = parts[0].split(',');
                    lat = parseFloat(coords[0]) || 0;
                    lng = parseFloat(coords[1]) || 0;
                    durationHours = parseInt(parts[1] || '0', 10);
                  } else if (isStaticLocationMsg) {
                    const coords = item.text!.substring(16).split(',');
                    lat = parseFloat(coords[0]) || 0;
                    lng = parseFloat(coords[1]) || 0;
                  }

                  return (
                    <View style={[styles.messageBubble, isMe ? styles.outgoingBubble : styles.incomingBubble, { maxWidth: '80%', padding: 0, overflow: 'hidden' }]}>
                      {!isMe && isGroup && (
                        <Text style={[styles.senderName, { color: getParticipantColor(item.senderId.displayName), padding: 8, paddingBottom: 4 }]}>
                          {item.senderId.displayName}
                        </Text>
                      )}
                      {isLocationStopped ? (
                        <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Ionicons name="navigate-outline" size={28} color={isMe ? '#FFF' : '#666'} />
                          <View>
                            <Text style={{ color: isMe ? '#FFF' : '#333', fontWeight: '600', fontSize: 14 }}>Live location ended</Text>
                            <Text style={{ color: isMe ? 'rgba(255,255,255,0.7)' : '#999', fontSize: 12 }}>{formatMessageTime(item.createdAt)}</Text>
                          </View>
                        </View>
                      ) : (
                        <>
                          <TouchableOpacity 
                            activeOpacity={0.8}
                            onPress={() => {
                              setMapModalCenter({ lat, lng });
                              setMapModalVisible(true);
                            }}
                          >
                            <View style={{ width: '100%', height: 150, backgroundColor: '#E8EAF6', justifyContent: 'center', alignItems: 'center' }}>
                              <View pointerEvents="none" style={{ width: '100%', height: '100%', position: 'absolute' }}>
                                <Map
                                  style={{ flex: 1 }}
                                  mapStyle={OSM_STYLE}
                                  scrollEnabled={false}
                                  pitchEnabled={false}
                                  rotateEnabled={false}
                                  zoomEnabled={false}
                                >
                                  <Camera
                                    initialViewState={{
                                      center: [lng, lat] as [number, number],
                                      zoom: 18,
                                    }}
                                  />
                                  <Marker id="mini-marker" lngLat={[lng, lat]}>
                                    <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: -12 }}>
                                      <Ionicons name="pin" size={24} color="#E53935" />
                                    </View>
                                  </Marker>
                                </Map>
                              </View>
                              <View style={{ position: 'absolute', backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}>
                                <Text style={{ color: '#5C6BC0', fontWeight: '700', fontSize: 12 }}>Tap to view full map</Text>
                              </View>
                            </View>
                            <View style={{ padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name={isStaticLocationMsg ? "pin" : "navigate"} size={18} color={isMe ? '#FFF' : (isStaticLocationMsg ? '#7E57C2' : '#00C853')} />
                              <View>
                                <Text style={{ color: isMe ? '#FFF' : '#333', fontWeight: '700', fontSize: 13 }}>
                                  {isStaticLocationMsg ? 'Location' : 'Live Location'}
                                </Text>
                                <Text style={{ color: isMe ? 'rgba(255,255,255,0.7)' : '#888', fontSize: 11 }}>
                                  {lat.toFixed(4)}, {lng.toFixed(4)}
                                </Text>
                              </View>
                            </View>
                            {isLocationMsg && (
                              <View style={{ backgroundColor: '#00C853', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>LIVE</Text>
                              </View>
                            )}
                          </View>
                          
                          {isLocationMsg && durationHours > 0 && (
                            <Text style={{ paddingHorizontal: 10, fontSize: 11, color: isMe ? 'rgba(255,255,255,0.8)' : '#777', fontStyle: 'italic' }}>
                              Sharing for {durationHours} hour{durationHours > 1 ? 's' : ''}
                            </Text>
                          )}
                          <Text style={[styles.attachmentTime, { paddingHorizontal: 10, paddingBottom: 6 }]}>{formatMessageTime(item.createdAt)}</Text>
                          </TouchableOpacity>

                          {isLocationMsg && isMe && isSharingLiveLoc && (
                            <TouchableOpacity 
                              style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', padding: 12, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }}
                              onPress={toggleLiveLocation}
                            >
                              <Text style={{ color: '#FFF', fontWeight: '700' }}>Stop Sharing</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  );
                }

                // Render custom Call Logs in the Chat History
                const isCallLog = item.text?.startsWith('CALL_LOG:');
                if (isCallLog) {
                  const parts = item.text.substring(9).split('|');
                  const callType = parts[0] || 'audio';
                  const callStatus = parts[1] || 'completed';
                  const callDuration = parseInt(parts[2] || '0', 10);
                  const isOutgoing = isMe;

                  // Helper function to format call duration
                  const formatCallDuration = (secs: number) => {
                    if (secs === 0) return '';
                    const mins = Math.floor(secs / 60);
                    const remainingSecs = secs % 60;
                    if (mins > 0) {
                      return `${mins}m ${remainingSecs}s`;
                    }
                    return `${remainingSecs}s`;
                  };

                  let statusText = '';
                  let statusIcon: any = 'arrow-up-right';
                  let statusColor = '#00E676'; // Green for outbound completed
                  
                  if (callStatus === 'missed') {
                    statusText = isOutgoing ? 'Outgoing Call (No Answer)' : 'Missed Call';
                    statusIcon = isOutgoing ? 'arrow-up-right' : 'arrow-down-left';
                    statusColor = '#FF3B30';
                  } else if (callStatus === 'rejected') {
                    statusText = isOutgoing ? 'Declined Call' : 'Rejected Call';
                    statusIcon = isOutgoing ? 'arrow-up-right' : 'arrow-down-left';
                    statusColor = '#E53935';
                  } else {
                    const durStr = formatCallDuration(callDuration);
                    statusText = `${callType === 'video' ? 'Video' : 'Voice'} Call${durStr ? ` (${durStr})` : ''}`;
                    statusIcon = isOutgoing ? 'arrow-up-right' : 'arrow-down-left';
                    statusColor = '#00E676';
                  }

                  return (
                    <View style={styles.callLogCenterWrapper}>
                      <View style={styles.callLogBubble}>
                        <View style={styles.callLogIconCircle}>
                          <Ionicons 
                            name={callType === 'video' ? 'videocam-outline' : 'call-outline'} 
                            size={20} 
                            color={callStatus === 'missed' ? '#FF3B30' : '#075E54'} 
                          />
                        </View>
                        <View style={styles.callLogTextContainer}>
                          <Text style={styles.callLogTitle}>{statusText}</Text>
                          <View style={styles.callLogSubrow}>
                            <Ionicons name={statusIcon} size={12} color={statusColor} style={{ marginRight: 4 }} />
                            <Text style={styles.callLogTime}>
                              {formatMessageTime(item.createdAt)}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity 
                          style={styles.callLogActionBtn}
                          onPress={() => router.push({
                            pathname: '/call',
                            params: {
                              chatId: chatId.toString(),
                              type: callType,
                              callerName: headerName,
                              callerAvatar: headerAvatar || '',
                              isGroup: isGroup ? 'true' : 'false',
                              receiverId: (receiverId as string) || ''
                            }
                          })}
                        >
                          <Text style={styles.callLogActionText}>Call Back</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                if (item.attachments && item.attachments.length > 0) {
                  const attachment = item.attachments[0];
                  
                  if (attachment.type === 'audio') {
                    return (
                      <View style={[styles.messageBubble, isMe ? styles.outgoingBubble : styles.incomingBubble, { maxWidth: '75%' }]}>
                        {!isMe && isGroup && (
                          <Text style={[styles.senderName, { color: getParticipantColor(item.senderId.displayName) }]}>
                            {item.senderId.displayName}
                          </Text>
                        )}
                        <AudioMessagePlayer url={attachment.url!} isMe={isMe} />
                        <Text style={styles.attachmentTime}>{formatMessageTime(item.createdAt)}</Text>
                      </View>
                    );
                  }

                  if (attachment.type === 'image') {
                    return (
                      <View style={[styles.messageBubble, isMe ? styles.outgoingBubble : styles.incomingBubble, { maxWidth: '75%', padding: 4 }]}>
                        {!isMe && isGroup && (
                          <Text style={[styles.senderName, { color: getParticipantColor(item.senderId.displayName), marginLeft: 4 }]}>
                            {item.senderId.displayName}
                          </Text>
                        )}
                        <TouchableOpacity onPress={() => setFullScreenImage(attachment.url || null)}>
                          <Image source={{ uri: attachment.url }} style={{ width: 220, height: 220, borderRadius: 8 }} />
                        </TouchableOpacity>
                        <Text style={[styles.attachmentTime, { marginRight: 4 }]}>{formatMessageTime(item.createdAt)}</Text>
                      </View>
                    );
                  }

                  if (attachment.type === 'video') {
                    return (
                      <View style={[styles.messageBubble, isMe ? styles.outgoingBubble : styles.incomingBubble, { maxWidth: '85%', padding: 4 }]}>
                        {!isMe && isGroup && (
                          <Text style={[styles.senderName, { color: getParticipantColor(item.senderId.displayName), marginLeft: 4 }]}>
                            {item.senderId.displayName}
                          </Text>
                        )}
                        <VideoMessagePlayer url={attachment.url!} />
                        <Text style={[styles.attachmentTime, { marginRight: 4 }]}>{formatMessageTime(item.createdAt)}</Text>
                      </View>
                    );
                  }

                  // Render Attachment (PDF/File)
                  return (
                    <View style={[styles.messageBubble, isMe ? styles.outgoingBubble : styles.incomingBubble, { maxWidth: '75%' }]}>
                      {!isMe && isGroup && (
                        <Text style={[styles.senderName, { color: getParticipantColor(item.senderId.displayName) }]}>
                          {item.senderId.displayName}
                        </Text>
                      )}
                      <FileViewer file={{ uri: attachment.url!, name: attachment.name, mimeType: attachment.type || 'application/octet-stream' }} />
                      <Text style={styles.attachmentTime}>{formatMessageTime(item.createdAt)}</Text>
                    </View>
                  );
                }

                return (
                  <View style={[
                    styles.messageBubble,
                    isMe ? styles.outgoingBubble : styles.incomingBubble
                  ]}>
                    {!isMe && isGroup && (
                      <Text style={[styles.senderName, { color: getParticipantColor(item.senderId.displayName) }]}>
                        {item.senderId.displayName}
                      </Text>
                    )}
                    <Text style={styles.messageText}>{item.text}</Text>
                    <View style={styles.messageMeta}>
                      <Text style={styles.messageTime}>{formatMessageTime(item.createdAt)}</Text>
                      {isMe && (
                        <Ionicons name="checkmark-done" size={16} color="#7E57C2" style={styles.checkIcon} />
                      )}
                    </View>
                  </View>
                );
              }}
              ListFooterComponent={() => {
                if (!isTyping) return null;
                return (
                  <View style={[styles.messageBubble, styles.incomingBubble, styles.typingBubble]}>
                    {!isGroup && (
                      <Text style={[styles.senderName, { color: '#7E57C2' }]}>
                        {headerName}
                      </Text>
                    )}
                    <TypingIndicator />
                  </View>
                );
              }}
            />
          )}

          {/* Mentions List */}
          {showMentions && (
            <View style={{ backgroundColor: '#FFF', maxHeight: 150, borderTopWidth: 1, borderColor: '#EEE' }}>
              <FlatList
                data={participants.filter(p => (p.displayName || '').toLowerCase().includes(mentionQuery) && p._id !== user?._id)}
                keyExtractor={item => item._id}
                keyboardShouldPersistTaps="always"
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={{ padding: 12, borderBottomWidth: 1, borderColor: '#EEE', flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => handleMentionSelect(item)}
                  >
                    {item.profileImage ? (
                      <Image source={{ uri: item.profileImage }} style={{ width: 30, height: 30, borderRadius: 15, marginRight: 10 }} />
                    ) : (
                      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#7E57C2', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                        <Text style={{ color: '#FFF' }}>{item.displayName?.charAt(0)}</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 16, color: '#333' }}>{item.displayName}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Expandable Attachment Menu */}
          {showAttachmentMenu && (
            <Animated.View style={styles.attachmentMenu}>
              <TouchableOpacity style={styles.attachmentMenuItem} onPress={() => { setShowAttachmentMenu(false); pickDocument(); }}>
                <View style={[styles.attachmentMenuIcon, { backgroundColor: '#5C6BC0' }]}>
                  <Ionicons name="document-text" size={24} color="#FFF" />
                </View>
                <Text style={styles.attachmentMenuText}>Document</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentMenuItem} onPress={() => { setShowAttachmentMenu(false); handleCamera(); }}>
                <View style={[styles.attachmentMenuIcon, { backgroundColor: '#E91E63' }]}>
                  <Ionicons name="camera" size={24} color="#FFF" />
                </View>
                <Text style={styles.attachmentMenuText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentMenuItem} onPress={() => { setShowAttachmentMenu(false); pickImage(false); }}>
                <View style={[styles.attachmentMenuIcon, { backgroundColor: '#9C27B0' }]}>
                  <Ionicons name="image" size={24} color="#FFF" />
                </View>
                <Text style={styles.attachmentMenuText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachmentMenuItem} onPress={() => { setShowAttachmentMenu(false); toggleLiveLocation(); }}>
                <View style={[styles.attachmentMenuIcon, { backgroundColor: isSharingLiveLoc ? '#FF3B30' : '#4CAF50' }]}>
                  <Ionicons name={isSharingLiveLoc ? "stop-circle" : "location"} size={24} color="#FFF" />
                </View>
                <Text style={styles.attachmentMenuText}>{isSharingLiveLoc ? "Stop Sharing" : "Location"}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Input Bar */}
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={[styles.inputIconBtn, isEmojiPickerOpen && { backgroundColor: '#E8EAF6', borderRadius: 20 }]} 
              onPress={() => setIsEmojiPickerOpen(true)}
            >
              <Ionicons name="happy-outline" size={26} color={isEmojiPickerOpen ? "#5C6BC0" : "#666"} />
            </TouchableOpacity>
            
            <TextInput
              style={styles.textInput}
              placeholder="Message..."
              placeholderTextColor="#999"
              multiline
              value={inputText}
              onChangeText={handleTyping}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              returnKeyType="send"
            />
            
            <TouchableOpacity 
              style={[styles.inputIconBtn, showAttachmentMenu && { backgroundColor: '#E8EAF6', borderRadius: 20 }]} 
              onPress={() => setShowAttachmentMenu(!showAttachmentMenu)}
            >
              <Ionicons name="add" size={28} color={showAttachmentMenu ? "#5C6BC0" : "#666"} />
            </TouchableOpacity>

            {inputText.length > 0 ? (
              <TouchableOpacity 
                style={styles.sendBtn}
                onPress={handleSend}
              >
                <Ionicons name="send" size={20} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <AudioRecorder key={audioRecorderKey} onSend={handleAudioSend} onCancel={handleAudioCancel} />
            )}
          </View>
          
          <MediaRecorder 
            visible={showMediaRecorder} 
            onClose={() => setShowMediaRecorder(false)} 
            onMediaCaptured={handleMediaCaptured} 
          />
          <LocationPicker
            visible={showLocationPicker}
            onClose={() => setShowLocationPicker(false)}
            onShareLocation={handleLocationSelected}
          />
          <Modal visible={mapModalVisible} animationType="slide" transparent={true}>
            <View style={{ flex: 1, backgroundColor: '#FFF' }}>
              <Map
                style={{ flex: 1 }}
                mapStyle={OSM_STYLE}
                logoEnabled={false}
              >
                <Camera
                  ref={modalCameraRef}
                  initialViewState={{
                    center: [mapModalCenter?.lng || 0, mapModalCenter?.lat || 0] as [number, number],
                    zoom: 17,
                  }}
                />
                
                {/* User's true live location with calibration heading cone */}
                <UserLocation 
                  visible={true} 
                  showsUserHeadingIndicator={true} 
                />

                {/* Render Directions Line if Route Exists */}
                {routeData && (
                  <GeoJSONSource id="routeSource" data={routeData}>
                    <Layer 
                      id="routeFill" 
                      type="line"
                      style={{ 
                        lineColor: '#7E57C2', 
                        lineWidth: 5, 
                        lineCap: 'round', 
                        lineJoin: 'round' 
                      }} 
                    />
                  </GeoJSONSource>
                )}

                {/* Tapped Location Marker (Animating Dot instead of Pin) */}
                {mapModalCenter && (
                  <Marker
                    id="tapped-loc"
                    lngLat={[mapModalCenter.lng, mapModalCenter.lat]}
                  >
                    <View style={styles.tappedMarker}>
                      <Animated.View style={{
                        position: 'absolute',
                        width: 40, height: 40, borderRadius: 20, backgroundColor: '#E53935',
                        opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                        transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2] }) }]
                      }} />
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#E53935', borderWidth: 2, borderColor: '#FFF' }} />
                    </View>
                  </Marker>
                )}

                {/* Draw all live locations */}
                {Object.keys(liveLocations).map(uid => {
                  const loc = liveLocations[uid];
                  const participant = participants.find(p => p._id === uid) || (uid === user?._id ? user : null);
                  if (!participant) return null;
                  const initial = participant.displayName ? participant.displayName.charAt(0).toUpperCase() : 'U';
                  return (
                    <Marker key={uid} id={`user-${uid}`} lngLat={[loc.lng, loc.lat]}>
                      <View style={styles.liveUserMarker}>
                        <Animated.View style={{
                          position: 'absolute',
                          width: 50, height: 50, borderRadius: 25, backgroundColor: '#00C853',
                          opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
                          transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.5] }) }]
                        }} />
                        <View style={styles.liveUserMarkerPointer} />
                        {participant.profileImage ? (
                          <Image source={{ uri: participant.profileImage }} style={styles.liveUserAvatar} />
                        ) : (
                          <View style={styles.liveUserInitialContainer}>
                            <Text style={styles.liveUserInitial}>{initial}</Text>
                          </View>
                        )}
                      </View>
                    </Marker>
                  );
                })}

                {/* My Own Location Animating Avatar (if not actively in liveLocations) */}
                {myLocation && !liveLocations[user?._id || ''] && (
                  <Marker id="my-loc" lngLat={[myLocation.lng, myLocation.lat]}>
                    <View style={styles.liveUserMarker}>
                      <Animated.View style={{
                        position: 'absolute',
                        width: 50, height: 50, borderRadius: 25, backgroundColor: '#2196F3', // Blue pulse for self
                        opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
                        transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.5] }) }]
                      }} />
                      <View style={[styles.liveUserMarkerPointer, { borderTopColor: '#2196F3' }]} />
                      {user?.profileImage ? (
                        <Image source={{ uri: user.profileImage }} style={[styles.liveUserAvatar, { borderColor: '#2196F3', borderWidth: 2 }]} />
                      ) : (
                        <View style={[styles.liveUserInitialContainer, { backgroundColor: '#2196F3' }]}>
                          <Text style={styles.liveUserInitial}>{user?.displayName?.charAt(0).toUpperCase() || 'M'}</Text>
                        </View>
                      )}
                    </View>
                  </Marker>
                )}
              </Map>

              {/* Floating Glassmorphic Header */}
              <View style={styles.floatingMapHeader}>
                <TouchableOpacity onPress={() => setMapModalVisible(false)} style={styles.floatingMapBackBtn}>
                  <Ionicons name="close" size={26} color="#333" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.floatingMapTitle}>Location Map</Text>
                  {routeDetails && (
                    <Text style={{ fontSize: 12, color: '#7E57C2', fontWeight: '600', marginTop: 2 }}>
                      {routeDetails.distance} • {routeDetails.duration} away
                    </Text>
                  )}
                </View>
                <View style={{ width: 40 }} />
              </View>

              {/* Recenter Button */}
              <TouchableOpacity 
                style={styles.recenterMapBtn}
                onPress={() => {
                  if (mapModalCenter) {
                    modalCameraRef.current?.flyTo({
                      center: [mapModalCenter.lng, mapModalCenter.lat],
                      zoom: 18,
                      duration: 800
                    });
                  }
                }}
              >
                <Ionicons name="locate" size={24} color="#7E57C2" />
              </TouchableOpacity>
              {/* Stop Sharing Button (Only visible if actively sharing) */}
              {isSharingLiveLoc && (
                <TouchableOpacity 
                  style={styles.floatingStopShareBtn}
                  onPress={toggleLiveLocation}
                >
                  <View style={styles.stopSharePulse} />
                  <Text style={styles.stopShareText}>Stop Sharing</Text>
                </TouchableOpacity>
              )}
            </View>
          </Modal>

          {/* Full Screen Image Viewer */}
          <Modal visible={!!fullScreenImage} animationType="fade" transparent={true}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
              <TouchableOpacity 
                style={{ position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 25 }}
                onPress={() => setFullScreenImage(null)}
              >
                <Ionicons name="close" size={30} color="#FFF" />
              </TouchableOpacity>
              {fullScreenImage && (
                <Image source={{ uri: fullScreenImage }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
              )}
            </View>
          </Modal>

          <EmojiPicker 
            open={isEmojiPickerOpen} 
            onClose={() => setIsEmojiPickerOpen(false)} 
            onEmojiSelected={(emojiObject) => {
              setInputText(prev => prev + emojiObject.emoji);
            }}
          />

        </ImageBackground>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 44 : 12,
    paddingBottom: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 4,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  avatarPlaceholder: {
    backgroundColor: '#7E57C2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    letterSpacing: -0.3,
  },
  chatStatus: {
    fontSize: 12,
    color: '#888',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerButton: {
    padding: 4,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F7F7F8', // Modern clean light gray
  },
  wallpaperOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFF',
    opacity: 0.6, // Soften the wallpaper to make bubbles pop
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
    maxWidth: '82%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  incomingBubble: {
    backgroundColor: '#FFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  outgoingBubble: {
    backgroundColor: '#7E57C2', // Deep vibrant purple
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#111',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    marginTop: 4,
    minWidth: 40,
  },
  messageTime: {
    fontSize: 11,
    color: '#888',
    marginRight: 4,
  },
  checkIcon: {
    marginLeft: 4,
  },
  attachmentMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  attachmentMenuItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentMenuIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  attachmentMenuText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  pdfContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  pdfIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#FF3B30', // Red for PDF
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pdfIconBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: -2,
  },
  pdfMeta: {
    flex: 1,
  },
  audioCancelText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  tappedMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16, // Center pin exactly
  },
  liveUserMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00C853',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  liveUserMarkerPointer: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#00C853',
  },
  liveUserAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  liveUserInitialContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7E57C2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveUserInitial: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  floatingMapHeader: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 44 : 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingMapBackBtn: {
    padding: 6,
    backgroundColor: '#F3F0FF',
    borderRadius: 20,
  },
  floatingMapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  recenterMapBtn: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingStopShareBtn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 8,
  },
  stopSharePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFF',
  },
  stopShareText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  pdfName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  pdfSize: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  attachmentTime: {
    fontSize: 11,
    color: '#888',
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  inputIconBtn: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    maxHeight: 120,
    color: '#333',
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#7E57C2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    shadowColor: '#7E57C2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  typingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 70,
    alignItems: 'flex-start',
  },
  typingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 12,
    marginTop: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#999',
    marginHorizontal: 3,
  },
  callLogCenterWrapper: {
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
  },
  callLogBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '85%',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  callLogIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  callLogTextContainer: {
    flex: 1,
  },
  callLogTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  callLogSubrow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  callLogTime: {
    fontSize: 11,
    color: '#666',
  },
  callLogActionBtn: {
    backgroundColor: '#075E54',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  callLogActionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
});
