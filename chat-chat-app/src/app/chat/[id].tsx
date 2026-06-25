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
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import MapView, { Marker } from 'react-native-maps';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { startLocationSharing, stopLocationSharing, isSharingLocation } from '../../services/location';

const whatsappWallpaper = require('../../../assets/images/whatsapp_wallpaper.png');

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
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [typingUser, setTypingUser] = useState('');
  const [liveLocations, setLiveLocations] = useState<{ [userId: string]: { lat: number, lng: number } }>({});
  const [isSharingLiveLoc, setIsSharingLiveLoc] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const socket = getSocket();

  useEffect(() => {
    if (isTyping) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [isTyping]);

  const fetchMessages = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getMessages(chatId.toString(), token);
      // successResponse spreads data at top level: { success, data: { data: [], pagination: {} } }
      // So the messages array lives at res.data.data
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
        { text: isSharingLiveLoc ? 'Stop Live Location' : 'Share Live Location', onPress: toggleLiveLocation },
      ]
    );
  };

  const toggleLiveLocation = async () => {
    if (isSharingLiveLoc) {
      await stopLocationSharing(chatId.toString());
      setIsSharingLiveLoc(false);
    } else {
      if (user?._id) {
        await startLocationSharing(chatId.toString(), user._id);
        setIsSharingLiveLoc(true);
      }
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

  const uploadAndSendMedia = async (uri: string, type: 'image' | 'file' | 'audio', fileName: string) => {
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
    pickImage(true);
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status === 'granted') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsRecording(true);
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        uploadAndSendMedia(uri, 'audio', 'voice-message.m4a');
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  };

  const playSound = async (uri: string) => {
    if (sound) {
      await sound.unloadAsync();
    }
    const { sound: newSound } = await Audio.Sound.createAsync({ uri });
    setSound(newSound);
    await newSound.playAsync();
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (!socket) return;
    if (text.length > 0) {
      socket.emit('typing', chatId);
    } else {
      socket.emit('stopTyping', chatId);
    }
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7E57C2" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item._id}
              contentContainerStyle={styles.messagesList}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => {
                const isMe = item.senderId._id === 'current-user' || item.senderId._id === user?._id;
                
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
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <TouchableOpacity onPress={() => playSound(attachment.url!)}>
                            <Ionicons name="play-circle" size={36} color={isMe ? "#FFF" : "#7E57C2"} />
                          </TouchableOpacity>
                          <Text style={{ marginLeft: 8, color: isMe ? "#FFF" : "#333", fontStyle: 'italic' }}>
                            Voice Message
                          </Text>
                        </View>
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
                        <Image source={{ uri: attachment.url }} style={{ width: 220, height: 220, borderRadius: 8 }} />
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
                      <View style={styles.pdfContainer}>
                        <View style={styles.pdfIconContainer}>
                          <Ionicons name="document-text" size={24} color="#FFF" />
                          <Text style={styles.pdfIconBadgeText}>FILE</Text>
                        </View>
                        <View style={styles.pdfMeta}>
                          <Text style={styles.pdfName} numberOfLines={1}>{attachment.name}</Text>
                          <Text style={styles.pdfSize}>{attachment.size || 'Unknown size'}</Text>
                        </View>
                      </View>
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

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.inputIconBtn}>
              <Ionicons name="happy-outline" size={24} color="#666" />
            </TouchableOpacity>
            
            {isRecording ? (
              <View style={[styles.textInput, { justifyContent: 'center', backgroundColor: '#FFEBEE' }]}>
                <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>Recording... Release to send</Text>
              </View>
            ) : (
              <TextInput
                style={styles.textInput}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                multiline
                value={inputText}
                onChangeText={handleTyping}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
                returnKeyType="send"
              />
            )}
            
            <TouchableOpacity style={styles.inputIconBtn} onPress={handleAttachMedia} disabled={isRecording}>
              <Ionicons name="attach-outline" size={24} color="#666" />
            </TouchableOpacity>

            {inputText.length === 0 && (
              <TouchableOpacity style={styles.inputIconBtn} onPress={handleCamera}>
                <Ionicons name="camera-outline" size={24} color="#666" />
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.sendBtn, isRecording && { backgroundColor: '#D32F2F', transform: [{ scale: 1.2 }] }]}
              onPress={inputText.length > 0 ? handleSend : undefined}
              onPressIn={inputText.length === 0 ? startRecording : undefined}
              onPressOut={inputText.length === 0 ? stopRecording : undefined}
              delayPressIn={0}
            >
              <Ionicons 
                name={inputText.length > 0 ? "send" : "mic"} 
                size={20} 
                color="#FFF" 
              />
            </TouchableOpacity>
          </View>
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
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 4,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
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
    backgroundColor: '#E5DDD5', // Classic WhatsApp beige color
  },
  wallpaperOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
    opacity: 0.03,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    borderRadius: 10,
    padding: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  incomingBubble: {
    backgroundColor: '#FFF',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 0,
  },
  outgoingBubble: {
    backgroundColor: '#F3E5F5', // WhatsApp light purple
    alignSelf: 'flex-end',
    borderTopRightRadius: 0,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#303030',
    lineHeight: 20,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    marginTop: 4,
    minWidth: 50,
  },
  messageTime: {
    fontSize: 11,
    color: '#888',
    marginRight: 4,
  },
  checkIcon: {
    marginLeft: 2,
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
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F0F0F0',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  inputIconBtn: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    color: '#333',
    marginHorizontal: 4,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7E57C2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
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
