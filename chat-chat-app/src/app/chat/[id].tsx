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
  ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';

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
  const [typingUser, setTypingUser] = useState('');

  const flatListRef = useRef<FlatList>(null);
  const socket = getSocket();

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

      // Listen for message events
      socket.on('message', (message: any) => {
        if (message.chatId === chatId) {
          setMessages((prev) => [...prev, message]);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      });

      // Typing Indicator Listeners
      socket.on('typing', (data: any) => {
        if (data.chatId === chatId && data.userId !== user?._id) {
          setIsTyping(true);
          setTypingUser('Someone');
        }
      });

      socket.on('stopTyping', (data: any) => {
        if (data.chatId === chatId && data.userId !== user?._id) {
          setIsTyping(false);
        }
      });

      // Live profile update: update header if this is a 1-1 chat with the user who changed
      socket.on('userProfileUpdated', (data: { userId: string; displayName?: string; profileImage?: string | null }) => {
        // In 1-1 chats, the chatName/chatAvatar come from the other participant
        // We patch the header if the sender is not ourselves
        if (!isGroup && data.userId !== user?._id) {
          if (data.displayName) setHeaderName(data.displayName);
          if (data.profileImage !== undefined) setHeaderAvatar(data.profileImage || '');
        }
      });
    }

    return () => {
      if (socket) {
        socket.emit('leaveChat', chatId);
        socket.off('message');
        socket.off('typing');
        socket.off('stopTyping');
        socket.off('userProfileUpdated');
      }
    };
  }, [chatId, token]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const textToSend = inputText;
    setInputText('');

    if (socket) {
      // Emit socket message
      socket.emit('sendMessage', {
        chatId: chatId.toString(),
        text: textToSend,
      });

      socket.emit('stopTyping', chatId);
    } else {
      // Fallback local representation if offline/initializing
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

  // Assign user profile color for group chats
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
        {/* Top Header Bar */}
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

        {/* Main Wallpaper/Doodle Background Area */}
        <ImageBackground 
          source={whatsappWallpaper} 
          style={styles.chatContainer}
          resizeMode="cover"
        >
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
                
                if (item.attachments && item.attachments.length > 0) {
                  // Render Attachment (PDF)
                  const pdf = item.attachments[0];
                  return (
                    <View style={[styles.messageBubble, styles.incomingBubble, { maxWidth: '75%' }]}>
                      <Text style={[styles.senderName, { color: getParticipantColor(item.senderId.displayName) }]}>
                        {item.senderId.displayName}
                      </Text>
                      <View style={styles.pdfContainer}>
                        <View style={styles.pdfIconContainer}>
                          <Ionicons name="document-text" size={24} color="#FFF" />
                          <Text style={styles.pdfIconBadgeText}>PDF</Text>
                        </View>
                        <View style={styles.pdfMeta}>
                          <Text style={styles.pdfName} numberOfLines={1}>{pdf.name}</Text>
                          <Text style={styles.pdfSize}>{pdf.size || 'Unknown size'}</Text>
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
            />
          )}

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.inputIconBtn}>
              <Ionicons name="happy-outline" size={24} color="#666" />
            </TouchableOpacity>
            
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
            
            <TouchableOpacity style={styles.inputIconBtn}>
              <Ionicons name="attach-outline" size={24} color="#666" />
            </TouchableOpacity>

            {inputText.length === 0 && (
              <TouchableOpacity style={styles.inputIconBtn}>
                <Ionicons name="camera-outline" size={24} color="#666" />
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.sendBtn}
              onPress={handleSend}
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
});
