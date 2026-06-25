import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  FlatList, 
  RefreshControl, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useRouter } from 'expo-router';

interface CallLogItem {
  _id: string;
  callerId: {
    _id: string;
    displayName?: string;
    mobileNumber: string;
    profileImage?: string;
  };
  receiverId: {
    _id: string;
    displayName?: string;
    mobileNumber: string;
    profileImage?: string;
  };
  chatId?: string;
  type: 'audio' | 'video';
  status: 'missed' | 'rejected' | 'completed';
  duration: number;
  createdAt: string;
}

export default function CallsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  
  const [logs, setLogs] = useState<CallLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCallLogs = async (isRefreshing = false) => {
    if (!token) return;
    if (!isRefreshing) setLoading(true);
    try {
      const res = await api.getCallLogs(token);
      setLogs(res.logs || res.data?.logs || []);
    } catch (error) {
      console.error('Failed to fetch call logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCallLogs();
  }, [token]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCallLogs(true);
  };

  const handleCallUser = (contact: any, callType: 'audio' | 'video') => {
    if (!contact) return;
    router.push({
      pathname: '/call',
      params: {
        chatId: contact.chatId || contact._id || '',
        type: callType,
        callerName: contact.displayName || contact.mobileNumber || 'Contact',
        callerAvatar: contact.profileImage || '',
        isGroup: 'false',
        receiverId: contact._id || ''
      }
    });
  };

  const formatDuration = (secs: number) => {
    if (secs === 0) return 'Missed';
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    if (mins > 0) {
      return `${mins}m ${remainingSecs}s`;
    }
    return `${remainingSecs}s`;
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const formatDay = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const renderLogItem = ({ item }: { item: CallLogItem }) => {
    if (!item.callerId || !item.receiverId) return null;
    const isOutgoing = item.callerId._id === user?._id;
    const targetContact = isOutgoing ? item.receiverId : item.callerId;
    if (!targetContact) return null;
    
    // Choose icon and color based on call status
    let statusIcon: any = 'arrow-up-right';
    let statusColor = '#00E676'; // Green for outbound completed

    if (item.status === 'missed') {
      statusIcon = isOutgoing ? 'arrow-up-right' : 'arrow-down-left';
      statusColor = '#FF3B30'; // Red for missed
    } else if (item.status === 'rejected') {
      statusIcon = isOutgoing ? 'arrow-up-right' : 'arrow-down-left';
      statusColor = '#E53935';
    } else if (!isOutgoing) {
      statusIcon = 'arrow-down-left';
      statusColor = '#00E676'; // Green for inbound completed
    }

    return (
      <View style={styles.logCard}>
        <View style={styles.leftContainer}>
          {targetContact.profileImage ? (
            <Image source={{ uri: targetContact.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={22} color="#FFF" />
            </View>
          )}
          
          <View style={styles.textContainer}>
            <Text style={styles.nameText} numberOfLines={1}>
              {targetContact.displayName || targetContact.mobileNumber}
            </Text>
            <View style={styles.statusRow}>
              <Ionicons name={statusIcon} size={14} color={statusColor} style={{ marginRight: 4 }} />
              <Text style={styles.timeText}>
                {formatDay(item.createdAt)}, {formatTime(item.createdAt)} • {item.status === 'missed' ? 'Missed' : formatDuration(item.duration)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.callButton}
          onPress={() => handleCallUser(targetContact, item.type)}
        >
          <Ionicons 
            name={item.type === 'video' ? 'videocam-outline' : 'call-outline'} 
            size={22} 
            color="#075E54" 
          />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calls</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={item => item._id}
        renderItem={renderLogItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            colors={['#075E54']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="call-outline" size={42} color="#999" />
            </View>
            <Text style={styles.emptyTitle}>No call logs yet</Text>
            <Text style={styles.emptySubtitle}>Calls you make and receive will show up here</Text>
          </View>
        }
      />

      {/* Floating Action Button for starting a new call */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push({
          pathname: '/new-chat',
          params: { isCall: 'true' }
        })}
      >
        <Ionicons name="call" size={24} color="#FFF" />
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#EFEFEF',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },
  listContainer: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.8,
    borderColor: '#F0F0F0',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DDD',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#075E54',
  },
  textContainer: {
    marginLeft: 14,
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 13,
    color: '#666',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 120,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 3 },
  },
});
