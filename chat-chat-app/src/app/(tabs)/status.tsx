import React, { useState, useCallback, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const { width } = Dimensions.get('window');

interface StatusUpdate {
  _id: string;
  content: string;
  type: 'text' | 'image';
  mediaUrl?: string;
  backgroundColor?: string;
  createdAt: string;
}

interface GroupedStatus {
  userId: string;
  displayName: string;
  profileImage?: string;
  status: 'online' | 'offline';
  updatedAt: string;
  statuses: StatusUpdate[];
}

export default function StatusScreen() {
  const { user, token } = useAuth();
  
  const [myStatuses, setMyStatuses] = useState<StatusUpdate[]>([]);
  const [recentStatuses, setRecentStatuses] = useState<GroupedStatus[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Status Viewer Modal State
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerGroup, setViewerGroup] = useState<{
    displayName: string;
    profileImage?: string;
    isOwn: boolean;
    statuses: StatusUpdate[];
  } | null>(null);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);

  const fetchStatuses = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getStatuses(token);
      const statusData = res.data || res;
      setMyStatuses(statusData.myStatuses || []);
      setRecentStatuses(statusData.recentStatuses || []);
    } catch (err) {
      console.log('Failed to fetch statuses:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStatuses();
    }, [token])
  );

  // Auto-advance story timer
  useEffect(() => {
    let timer: any;
    if (viewerVisible && viewerGroup) {
      const currentStatuses = viewerGroup.statuses;
      timer = setTimeout(() => {
        if (activeStatusIndex < currentStatuses.length - 1) {
          setActiveStatusIndex(prev => prev + 1);
        } else {
          setViewerVisible(false);
          setViewerGroup(null);
        }
      }, 5000); // 5 seconds per status
    }
    return () => clearTimeout(timer);
  }, [viewerVisible, viewerGroup, activeStatusIndex]);

  const handleCreateStatus = () => {
    const bgColors = ['#7E57C2', '#EC407A', '#26A69A', '#42A5F5', '#FF7043', '#263238'];
    const randomBg = bgColors[Math.floor(Math.random() * bgColors.length)];

    Alert.prompt(
      'New Status Update',
      'What would you like to share today?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Post',
          onPress: async (text?: string) => {
            if (!text || !text.trim() || !token) return;
            try {
              const res = await api.createStatus({
                content: text.trim(),
                type: 'text',
                backgroundColor: randomBg
              }, token);
              
              if (res.status) {
                Alert.alert('Posted', 'Status update posted successfully!');
                fetchStatuses();
              }
            } catch (err) {
              console.log('Failed to create status:', err);
              Alert.alert('Error', 'Failed to post status. Please try again.');
            }
          },
        },
      ],
      'plain-text',
      ''
    );
  };

  const handleDeleteStatus = async (statusId: string) => {
    if (!token) return;
    Alert.alert(
      'Delete Status',
      'Are you sure you want to delete this status update?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteStatus(statusId, token);
              Alert.alert('Deleted', 'Status update deleted successfully!');
              
              // Close viewer or advance index if we have more statuses
              if (viewerGroup && viewerGroup.statuses.length > 1) {
                const updatedStatuses = viewerGroup.statuses.filter(s => s._id !== statusId);
                setViewerGroup({
                  ...viewerGroup,
                  statuses: updatedStatuses
                });
                setActiveStatusIndex(prev => Math.max(0, prev - 1));
              } else {
                setViewerVisible(false);
                setViewerGroup(null);
              }
              fetchStatuses();
            } catch (err) {
              console.log('Failed to delete status:', err);
            }
          }
        }
      ]
    );
  };

  const handleNextStatus = () => {
    if (!viewerGroup) return;
    if (activeStatusIndex < viewerGroup.statuses.length - 1) {
      setActiveStatusIndex(prev => prev + 1);
    } else {
      setViewerVisible(false);
      setViewerGroup(null);
    }
  };

  const handlePrevStatus = () => {
    if (!viewerGroup) return;
    if (activeStatusIndex > 0) {
      setActiveStatusIndex(prev => prev - 1);
    }
  };

  const openViewer = (group: GroupedStatus | { displayName: string; profileImage?: string; isOwn: boolean; statuses: StatusUpdate[] }) => {
    if (!group.statuses || group.statuses.length === 0) return;
    setViewerGroup(group as any);
    setActiveStatusIndex(0);
    setViewerVisible(true);
  };

  const formatStatusTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Status</Text>
      </View>

      <FlatList
        data={recentStatuses}
        keyExtractor={item => item.userId}
        ListHeaderComponent={() => (
          <View>
            {/* My Status Row */}
            <TouchableOpacity 
              style={styles.myStatusItem} 
              onPress={() => {
                if (myStatuses.length > 0) {
                  openViewer({
                    displayName: 'My Status',
                    profileImage: user?.profileImage,
                    isOwn: true,
                    statuses: myStatuses
                  });
                } else {
                  handleCreateStatus();
                }
              }}
            >
              <View style={styles.avatarContainer}>
                {user?.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={24} color="#FFF" />
                  </View>
                )}
                {myStatuses.length === 0 ? (
                  <View style={styles.plusBadge}>
                    <Ionicons name="add" size={12} color="#FFF" />
                  </View>
                ) : (
                  <View style={[styles.storyCountRing, { borderColor: '#7E57C2' }]} />
                )}
              </View>
              
              <View style={styles.statusDetails}>
                <Text style={styles.displayName}>My Status</Text>
                <Text style={styles.sloganText} numberOfLines={1}>
                  {myStatuses.length > 0 
                    ? `Tap to view your ${myStatuses.length} updates`
                    : 'Tap to add a status update'
                  }
                </Text>
              </View>

              {myStatuses.length > 0 && (
                <TouchableOpacity style={styles.addButtonCircle} onPress={handleCreateStatus}>
                  <Ionicons name="add-circle" size={32} color="#7E57C2" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <Text style={styles.sectionHeader}>Recent Updates</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const latestStatus = item.statuses[0];
          return (
            <TouchableOpacity 
              style={styles.contactStatusItem}
              onPress={() => openViewer({ ...item, isOwn: false })}
            >
              <View style={styles.avatarContainer}>
                <View style={[styles.storyCountRing, { borderColor: '#7E57C2' }]} />
                {item.profileImage ? (
                  <Image source={{ uri: item.profileImage }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>{item.displayName.substring(0, 1).toUpperCase()}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.statusDetails}>
                <Text style={styles.displayName}>{item.displayName}</Text>
                <Text style={styles.sloganText} numberOfLines={1}>
                  {latestStatus.content}
                </Text>
                <Text style={styles.timeText}>
                  {formatStatusTime(latestStatus.createdAt)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={() => (
          loading ? (
            <ActivityIndicator size="large" color="#7E57C2" style={{ marginTop: 32 }} />
          ) : (
            <Text style={styles.emptyText}>No recent status updates from contacts</Text>
          )
        )}
        contentContainerStyle={styles.listContent}
      />

      {/* Floating Action Button to post status */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateStatus}>
        <Ionicons name="create" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Fullscreen Status Stories Viewer Modal */}
      {viewerGroup && viewerGroup.statuses && viewerGroup.statuses.length > 0 && (
        <Modal
          visible={viewerVisible}
          transparent={false}
          animationType="fade"
          onRequestClose={() => {
            setViewerVisible(false);
            setViewerGroup(null);
          }}
        >
          <SafeAreaView style={[
            styles.modalContainer, 
            { backgroundColor: viewerGroup.statuses[activeStatusIndex]?.backgroundColor || '#1E1E1E' }
          ]}>
            <StatusBar style="light" />

            {/* Tap Triggers left and right for navigation */}
            <View style={styles.tapGestureContainer}>
              <TouchableOpacity style={styles.leftTapArea} onPress={handlePrevStatus} activeOpacity={1} />
              <TouchableOpacity style={styles.rightTapArea} onPress={handleNextStatus} activeOpacity={1} />
            </View>
            
            {/* Top Bar with Profile Info and Segmented Progress Indicators */}
            <View style={styles.modalHeaderContainer}>
              {/* Progress segments */}
              <View style={styles.progressSegmentsContainer}>
                {viewerGroup.statuses.map((_, idx) => (
                  <View 
                    key={idx} 
                    style={[
                      styles.progressSegment, 
                      { 
                        backgroundColor: idx < activeStatusIndex 
                          ? '#FFF' 
                          : idx === activeStatusIndex 
                            ? '#FFF' 
                            : 'rgba(255,255,255,0.4)' 
                      }
                    ]} 
                  />
                ))}
              </View>

              {/* User details */}
              <View style={styles.modalUserRow}>
                <View style={styles.modalUserInfo}>
                  {viewerGroup.profileImage ? (
                    <Image source={{ uri: viewerGroup.profileImage }} style={styles.modalAvatar} />
                  ) : (
                    <View style={[styles.modalAvatar, styles.avatarPlaceholder, { backgroundColor: '#333' }]}>
                      <Text style={styles.avatarText}>
                        {viewerGroup.displayName.substring(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.modalDisplayName}>{viewerGroup.displayName}</Text>
                    <Text style={styles.modalTimeText}>
                      {formatStatusTime(viewerGroup.statuses[activeStatusIndex]?.createdAt)}
                    </Text>
                  </View>
                </View>

                {/* Top Action Buttons (Delete or Close) */}
                <View style={styles.modalActions}>
                  {viewerGroup.isOwn && (
                    <TouchableOpacity 
                      onPress={() => handleDeleteStatus(viewerGroup.statuses[activeStatusIndex]._id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={24} color="#FF5252" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    onPress={() => {
                      setViewerVisible(false);
                      setViewerGroup(null);
                    }} 
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={28} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Central Status Content */}
            <View style={styles.modalContent}>
              <Text style={styles.modalSloganText}>
                {viewerGroup.statuses[activeStatusIndex]?.content}
              </Text>
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
  },
  listContent: {
    paddingBottom: 80,
  },
  myStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  contactStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F9F9F9',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    zIndex: 1,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#7E57C2',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
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
    zIndex: 2,
  },
  storyCountRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 30,
    borderWidth: 2,
    borderStyle: 'dashed',
    zIndex: 0,
  },
  statusDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  sloganText: {
    fontSize: 14,
    color: '#666',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  addButtonCircle: {
    paddingLeft: 8,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
    backgroundColor: '#F9F9F9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#7E57C2',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  // Modal viewer styles
  modalContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  tapGestureContainer: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    zIndex: 1,
  },
  leftTapArea: {
    flex: 1,
    height: '100%',
  },
  rightTapArea: {
    flex: 2,
    height: '100%',
  },
  modalHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 10,
    zIndex: 10,
  },
  progressSegmentsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  modalUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  modalDisplayName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  modalTimeText: {
    color: '#DDD',
    fontSize: 12,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  deleteButton: {
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  closeButton: {
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 5,
  },
  modalSloganText: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 38,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});
