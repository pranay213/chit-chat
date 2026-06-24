import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api, API_BASE_URL } from '../../services/api';
import { getSocket } from '../../services/socket';

interface ChatMessage {
  _id: string;
  text?: string;
  createdAt: string;
}

interface Participant {
  _id: string;
  displayName: string;
  profileImage?: string;
  status: 'online' | 'offline';
  mobileNumber?: string;
  email?: string;
}

interface ChatThread {
  _id: string;
  isGroup: boolean;
  groupName?: string;
  groupPhoto?: string;
  participants: Participant[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

export default function ChatsScreen() {
  const router = useRouter();
  const { user, token, refreshUser } = useAuth();
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [stories, setStories] = useState<any[]>([
    { id: 'my-status', name: 'My status', avatar: null, isMyStatus: true }
  ]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const toggleSelectChat = (chatId: string) => {
    setSelectedChats((prev) => {
      if (prev.includes(chatId)) {
        const next = prev.filter((id) => id !== chatId);
        if (next.length === 0) {
          setIsSelectionMode(false);
        }
        return next;
      } else {
        return [...prev, chatId];
      }
    });
  };

  const handleLongPress = (chatId: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedChats([chatId]);
    }
  };

  const handlePress = (item: ChatThread) => {
    if (isSelectionMode) {
      toggleSelectChat(item._id);
    } else {
      const otherParticipant = item.participants.find((p: any) => p._id !== user?._id) || item.participants[0];
      const isSelfChat = !item.isGroup && (item.participants.length === 1 || item.participants.every((p: any) => p._id === user?._id));
      const chatName = item.isGroup 
        ? item.groupName 
        : isSelfChat 
          ? 'Me' 
          : otherParticipant?.displayName || otherParticipant?.mobileNumber || otherParticipant?.email || 'Unknown';
      const chatAvatar = item.isGroup ? item.groupPhoto : otherParticipant?.profileImage;
      const isOnline = !item.isGroup && otherParticipant?.status === 'online';
      router.push({
        pathname: '/chat/[id]',
        params: {
          id: item._id,
          chatName: chatName || '',
          chatAvatar: chatAvatar || '',
          isGroup: item.isGroup ? 'true' : 'false',
          isOnline: isOnline ? 'true' : 'false',
          receiverId: otherParticipant?._id || ''
        }
      });
    }
  };

  const deleteSelectedChats = async () => {
    if (!token || selectedChats.length === 0) return;
    
    Alert.alert(
      'Delete Chats',
      `Are you sure you want to delete ${selectedChats.length} selected chat(s)? This will erase all message history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.deleteMultipleChats(selectedChats, token);
              setChats(prev => prev.filter(c => !selectedChats.includes(c._id)));
              setIsSelectionMode(false);
              setSelectedChats([]);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete selected chats');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const deleteAllChats = async () => {
    if (!token || chats.length === 0) return;
    
    Alert.alert(
      'Delete All Chats',
      'Are you sure you want to delete ALL chats? This will completely clear your chat history.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete All', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const allChatIds = chats.map(c => c._id);
              await api.deleteMultipleChats(allChatIds, token);
              setChats([]);
              setIsSelectionMode(false);
              setSelectedChats([]);
              setShowMenu(false);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete all chats');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const selectAllChats = () => {
    const allIds = chats.map(c => c._id);
    setSelectedChats(allIds);
  };

  const fetchChats = async () => {
    if (!user || !token) return;
    setLoading(true);
    try {
      const res = await api.getChats(user._id, token);
      const chatList = res.data?.data || res.data || res.docs || [];
      setChats(chatList);
    } catch (err) {
      console.log('Error fetching chats from API:', err);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStories = async () => {
    if (!token) return;
    try {
      const res = await api.getStatuses(token);
      const statusData = res.data || res;
      const myStatuses = statusData.myStatuses || [];
      const recentStatuses = statusData.recentStatuses || [];

      const otherContactsStories = recentStatuses.map((g: any) => ({
        id: g.userId,
        name: g.displayName || 'Unknown',
        avatar: g.profileImage || null,
        online: g.status === 'online',
        isMyStatus: false,
        statuses: g.statuses
      }));

      setStories([
        { 
          id: 'my-status', 
          name: 'My status', 
          avatar: user?.profileImage || null, 
          isMyStatus: true,
          hasStatus: myStatuses.length > 0,
          statuses: myStatuses
        },
        ...otherContactsStories
      ]);
    } catch (err) {
      console.log('Error fetching stories:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchChats();
      fetchStories();
      refreshUser();
    }, [token])  // Only re-run when token changes, not on every user update
  );

  useEffect(() => {
    // Socket.io Real-time event handling
    const socket = getSocket();
    if (socket) {
      socket.on('message', (message: any) => {
        // Find which chat thread this message belongs to
        setChats((prevChats) => {
          return prevChats.map((c) => {
            if (c._id === message.chatId) {
              return {
                ...c,
                lastMessage: {
                  _id: message._id,
                  text: message.text,
                  createdAt: message.createdAt,
                },
                unreadCount: (c.unreadCount || 0) + 1,
              };
            }
            return c;
          });
        });
      });

      // Live profile update: patch displayName + avatar for any participant who updated
      socket.on('userProfileUpdated', (data: { userId: string; displayName?: string; profileImage?: string | null }) => {
        setChats((prevChats) =>
          prevChats.map((c) => ({
            ...c,
            participants: c.participants.map((p: any) => {
              if (p._id === data.userId) {
                return {
                  ...p,
                  displayName: data.displayName ?? p.displayName,
                  profileImage: data.profileImage !== undefined ? data.profileImage : p.profileImage,
                };
              }
              return p;
            })
          }))
        );

        // Also update stories row avatar
        setStories((prev) =>
          prev.map((s) => {
            if (s.id === data.userId) {
              return {
                ...s,
                name: data.displayName ?? s.name,
                avatar: data.profileImage !== undefined ? data.profileImage : s.avatar,
              };
            }
            return s;
          })
        );
      });
    }

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('message');
        socket.off('userProfileUpdated');
      }
    };
  }, [user, token]);

  const filteredChats = chats.filter(c => {
    const otherParticipant = c.participants.find((p: any) => p._id !== user?._id) || c.participants[0];
    const isSelfChat = !c.isGroup && (c.participants.length === 1 || c.participants.every((p: any) => p._id === user?._id));
    const name = c.isGroup 
      ? c.groupName 
      : isSelfChat 
        ? 'Me' 
        : otherParticipant?.displayName || otherParticipant?.mobileNumber || otherParticipant?.email || 'Unknown';
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      return date.toLocaleDateString([], { weekday: 'long' });
    } catch (e) {
      return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Top Header */}
      {isSelectionMode ? (
        <View style={[styles.header, { backgroundColor: '#7E57C2' }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedChats([]); }} style={styles.headerButton}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: '#FFF', marginLeft: 8 }]}>{selectedChats.length} selected</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={selectAllChats} style={styles.headerButton}>
              <Ionicons name="checkmark-done" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={deleteSelectedChats} style={styles.headerButton}>
              <Ionicons name="trash" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/settings')}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.myAvatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {user?.displayName ? user.displayName.substring(0, 1).toUpperCase() : 'C'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Chats</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton} onPress={() => {}}>
              <Ionicons name="search" size={22} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => setShowMenu(!showMenu)}>
              <Ionicons name="ellipsis-vertical" size={22} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Dropdown Menu for Ellipsis */}
      {showMenu && !isSelectionMode && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity 
            style={styles.dropdownItem} 
            onPress={() => {
              setShowMenu(false);
              setIsSelectionMode(true);
              setSelectedChats([]);
            }}
          >
            <Ionicons name="checkbox-outline" size={18} color="#333" />
            <Text style={styles.dropdownItemText}>Select Chats</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.dropdownItem} 
            onPress={deleteAllChats}
          >
            <Ionicons name="trash-outline" size={18} color="#E53935" />
            <Text style={[styles.dropdownItemText, { color: '#E53935' }]}>Delete All Chats</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search chats"
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Stories / Status row */}
      <View style={styles.storiesSection}>
        <FlatList
          data={stories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.storyItem} onPress={() => router.push('/status')}>
              <View style={styles.storyRingContainer}>
                {item.isMyStatus ? (
                  <View style={styles.myStatusContainer}>
                    {item.avatar ? (
                      <Image source={{ uri: item.avatar }} style={styles.storyAvatar} />
                    ) : (
                      <View style={[styles.storyAvatar, { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="person" size={24} color="#666" />
                      </View>
                    )}
                    {!item.hasStatus ? (
                      <View style={styles.plusBadge}>
                        <Ionicons name="add" size={12} color="#FFF" />
                      </View>
                    ) : (
                      <View style={[styles.storyAvatarBorder, styles.storyAvatarBorderActive, { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 28 }]} />
                    )}
                  </View>
                ) : (
                  <View style={[styles.storyAvatarBorder, styles.storyAvatarBorderActive]}>
                    {item.avatar ? (
                      <Image source={{ uri: item.avatar }} style={styles.storyAvatar} />
                    ) : (
                      <View style={[styles.storyAvatar, { backgroundColor: '#7E57C2', justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>
                          {item.name ? item.name.substring(0, 1).toUpperCase() : 'U'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              <Text style={styles.storyName} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.storiesList}
        />
      </View>

      {/* Chats List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7E57C2" />
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={item => item._id}
          renderItem={({ item }) => {
            const otherParticipant = item.participants.find((p: any) => p._id !== user?._id) || item.participants[0];
            const isSelfChat = !item.isGroup && (item.participants.length === 1 || item.participants.every((p: any) => p._id === user?._id));
            const chatName = item.isGroup 
              ? item.groupName 
              : isSelfChat 
                ? 'Me' 
                : otherParticipant?.displayName || otherParticipant?.mobileNumber || otherParticipant?.email || 'Unknown';
            const chatAvatar = item.isGroup ? item.groupPhoto : otherParticipant?.profileImage;
            const isOnline = !item.isGroup && otherParticipant?.status === 'online';
            const isSelected = selectedChats.includes(item._id);

            return (
              <TouchableOpacity 
                style={[styles.chatItem, isSelected && { backgroundColor: '#F3E5F5' }]}
                onPress={() => handlePress(item)}
                onLongPress={() => handleLongPress(item._id)}
                delayLongPress={300}
              >
                {/* Avatar */}
                <View style={styles.chatAvatarContainer}>
                  {chatAvatar ? (
                    <Image source={{ uri: chatAvatar }} style={styles.chatAvatar} />
                  ) : (
                    <View style={[styles.chatAvatar, styles.chatAvatarPlaceholder, item.isGroup && styles.groupAvatar]}>
                      <Ionicons 
                        name={item.isGroup ? "people" : "person"} 
                        size={24} 
                        color="#FFF" 
                      />
                    </View>
                  )}
                  {isOnline && <View style={styles.onlineBadge} />}
                </View>

                {/* Details */}
                <View style={styles.chatDetails}>
                  <View style={styles.chatHeaderRow}>
                    <Text style={styles.chatName} numberOfLines={1}>{chatName}</Text>
                    <Text style={styles.chatTime}>
                      {item.lastMessage ? formatTime(item.lastMessage.createdAt) : ''}
                    </Text>
                  </View>
                  <View style={styles.chatMessageRow}>
                    <Text style={[styles.chatLastMessage, item.unreadCount && item.unreadCount > 0 ? styles.unreadMessageText : null]} numberOfLines={1}>
                      {item.lastMessage?.text || 'No messages yet'}
                    </Text>
                    {item.unreadCount && item.unreadCount > 0 ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {isSelectionMode && (
                  <View style={{ marginLeft: 8, justifyContent: 'center' }}>
                    <Ionicons 
                      name={isSelected ? "checkbox" : "square-outline"} 
                      size={22} 
                      color={isSelected ? "#7E57C2" : "#999"} 
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.chatListContent}
        />
      )}

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/new-chat')}
      >
        <Ionicons name="pencil" size={24} color="#FFF" />
      </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingBottom: 12,
    backgroundColor: '#FFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  myAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7E57C2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  storiesSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 16,
    marginBottom: 8,
  },
  storiesList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyItem: {
    alignItems: 'center',
    width: 65,
  },
  storyRingContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  myStatusContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#7E57C2',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyAvatarBorder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    borderColor: '#EFEFEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyAvatarBorderActive: {
    borderColor: '#7E57C2',
  },
  storyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  storyName: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatListContent: {
    paddingBottom: 80,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  chatAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  chatAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  chatAvatarPlaceholder: {
    backgroundColor: '#128C7E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatar: {
    backgroundColor: '#7E57C2',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  chatDetails: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: 12,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: '#888',
  },
  chatMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatLastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadMessageText: {
    color: '#111',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#7E57C2',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#7E57C2',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#7E57C2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 90 : 60,
    right: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 8,
    width: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
});
