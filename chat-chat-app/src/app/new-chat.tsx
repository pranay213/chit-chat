import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts/legacy';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, api } from '../services/api';

interface Contact {
  _id: string;
  displayName: string;
  profileImage?: string;
  status: 'online' | 'offline';
  email?: string;
  mobileNumber?: string;
  lastSeen?: string;
}

export default function NewChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isCall = params.isCall === 'true';
  const { token, user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCallPress = async (contact: Contact, callType: 'audio' | 'video') => {
    if (contact._id === user?._id) return;
    if (!user || !token) return;
    setLoading(true);
    try {
      const res = await api.createOrGetChat(user._id, contact._id, token);
      const chat = res.chat;
      if (chat) {
        router.push({
          pathname: '/call',
          params: {
            chatId: chat._id,
            type: callType,
            callerName: contact.displayName,
            callerAvatar: contact.profileImage || '',
            isGroup: 'false',
            receiverId: contact._id
          }
        });
      } else {
        Alert.alert('Error', 'Could not start call');
      }
    } catch (err) {
      console.error('Failed to start call session:', err);
      Alert.alert('Error', 'Failed to start call session');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all registered users to start chats with
  const fetchContacts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Fetch registered users from API
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      let dbUsers: any[] = [];
      if (response.ok) {
        const resData = await response.json();
        dbUsers = resData.data?.data || resData.data || resData.docs || [];
      }

      // 2. Request permissions and fetch device contacts
      const { status } = await Contacts.requestPermissionsAsync();
      
      let matchedUsers: Contact[] = [];
      let selfContact: Contact | null = null;

      // Make a Me contact using currently logged in user info
      if (user) {
        selfContact = {
          _id: user._id,
          displayName: `${user.displayName || user.email || user.mobileNumber || 'Me'} (Me)`,
          profileImage: user.profileImage,
          status: 'online',
          email: user.email,
          mobileNumber: user.mobileNumber
        };
      }

      if (status === 'granted') {
        const { data: deviceContacts } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
        });

        // Extract and normalize all numbers/emails from device contacts
        const devicePhoneNumbers = new Set<string>();
        const deviceEmails = new Set<string>();

        deviceContacts.forEach(dc => {
          if (dc.phoneNumbers) {
            dc.phoneNumbers.forEach(p => {
              if (p.number) {
                // Normalize number: remove all non-digit chars except plus sign
                const normalized = p.number.replace(/[^\d+]/g, '');
                devicePhoneNumbers.add(normalized);
                // Also add last 10 digits as fallback
                if (normalized.length >= 10) {
                  devicePhoneNumbers.add(normalized.slice(-10));
                }
              }
            });
          }
          if (dc.emails) {
            dc.emails.forEach(e => {
              if (e.email) {
                deviceEmails.add(e.email.toLowerCase().trim());
              }
            });
          }
        });

        // Filter backend users matching the device contacts
        matchedUsers = dbUsers.filter((dbU: any) => {
          // Skip if this is the current logged-in user (we handle Self separately)
          if (dbU._id === user?._id) return false;

          // Check email match
          if (dbU.email && deviceEmails.has(dbU.email.toLowerCase().trim())) {
            return true;
          }

          // Check phone number match
          if (dbU.mobileNumber) {
            const normDbPhone = dbU.mobileNumber.replace(/[^\d+]/g, '');
            if (devicePhoneNumbers.has(normDbPhone)) {
              return true;
            }
            if (normDbPhone.length >= 10 && devicePhoneNumbers.has(normDbPhone.slice(-10))) {
              return true;
            }
          }

          return false;
        });

        // If no matching contacts found but we have device contacts, let's keep the selfContact
        // or show matches. If we failed to find any, we can show a nice warning or show all DB users
        // so that the user is not stuck with an empty contact list.
        if (matchedUsers.length === 0) {
          // If no matches, fallback to all users except current user
          matchedUsers = dbUsers.filter((u: any) => u._id !== user?._id);
        }
      } else {
        // Fallback to displaying all registered database users except currently logged-in user
        matchedUsers = dbUsers.filter((u: any) => u._id !== user?._id);
      }

      // Prepend selfContact (Me) at the top of the contact list
      if (selfContact) {
        setContacts([selfContact, ...matchedUsers]);
      } else {
        setContacts(matchedUsers);
      }
    } catch (err) {
      console.log('Failed to fetch/match contacts:', err);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [token]);

  const filteredContacts = contacts.filter(c => 
    c.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const startChat = async (contact: Contact) => {
    if (!user || !token) return;
    setLoading(true);
    try {
      const res = await api.createOrGetChat(user._id, contact._id, token);
      const chat = res.chat;
      if (chat) {
        router.replace({
          pathname: '/chat/[id]',
          params: {
            id: chat._id,
            chatName: contact.displayName,
            chatAvatar: contact.profileImage || '',
            isGroup: 'false',
            isOnline: contact.status === 'online' ? 'true' : 'false',
            receiverId: contact._id
          }
        });
      } else {
        Alert.alert('Error', 'Could not create chat');
      }
    } catch (err) {
      console.error('Failed to start chat session:', err);
      Alert.alert('Error', 'Failed to start chat session');
    } finally {
      setLoading(false);
    }
  };

  const startAIChat = async () => {
    // Find Ollama AI Bot in contacts
    const aiBot = contacts.find(c => c.mobileNumber === '9999999999');
    if (aiBot) {
      await startChat(aiBot);
    } else {
      if (!user || !token) return;
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const resData = await response.json();
          const dbUsers = resData.data?.data || resData.data || resData.docs || [];
          const matchedBot = dbUsers.find((u: any) => u.mobileNumber === '9999999999');
          if (matchedBot) {
            await startChat(matchedBot);
            return;
          }
        }
        Alert.alert('Error', 'Ollama AI Bot user not found. Please verify the backend is running.');
      } catch (err) {
        console.error('Error starting AI Chat:', err);
        Alert.alert('Error', 'Failed to start AI Chat session');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{isCall ? 'New Call' : 'Select Contact'}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>{contacts.length} contacts</Text>
          </View>
        </View>
        <TouchableOpacity onPress={fetchContacts} style={{ padding: 8 }}>
          {loading ? (
            <ActivityIndicator size="small" color="#7E57C2" />
          ) : (
            <Ionicons name="refresh-outline" size={24} color="#7E57C2" />
          )}
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts or groups"
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={filteredContacts}
        keyExtractor={item => item._id}
        ListHeaderComponent={() => {
          if (search) return null;
          return (
            <View style={styles.actionItems}>
              <TouchableOpacity style={styles.actionItem} onPress={() => Alert.alert('New Group', 'Create Group Chat')}>
                <View style={styles.actionIconContainer}>
                   <Ionicons name="people" size={22} color="#7E57C2" />
                </View>
                <Text style={styles.actionText}>New Group</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionItem} onPress={() => Alert.alert('New Contact', 'Create Contact')}>
                <View style={styles.actionIconContainer}>
                   <Ionicons name="person-add" size={22} color="#7E57C2" />
                </View>
                <Text style={styles.actionText}>New Contact</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionItem} onPress={() => Alert.alert('New Community', 'Create Community')}>
                <View style={styles.actionIconContainer}>
                   <Ionicons name="globe" size={22} color="#7E57C2" />
                </View>
                <Text style={styles.actionText}>New Community</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionItem} onPress={startAIChat}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                   <Ionicons name="hardware-chip" size={22} color="#00C853" />
                </View>
                <Text style={[styles.actionText, { color: '#00C853', fontWeight: '600' }]}>Chat with AI (Ollama)</Text>
              </TouchableOpacity>

              <Text style={styles.sectionHeader}>Contacts</Text>
            </View>
          );
        }}
        renderItem={({ item }) => {
          const handleContactPress = () => {
            if (isCall) {
              handleCallPress(item, 'audio');
            } else {
              startChat(item);
            }
          };

          return (
            <View style={styles.contactRowContainer}>
              <TouchableOpacity 
                style={[styles.contactItem, { flex: 1 }]}
                onPress={handleContactPress}
              >
                <View style={styles.avatarContainer}>
                  {item.profileImage ? (
                    <Image source={{ uri: item.profileImage }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>{item.displayName.substring(0, 1).toUpperCase()}</Text>
                    </View>
                  )}
                  {item.status === 'online' && <View style={styles.onlineBadge} />}
                </View>
                
                <View style={styles.contactDetails}>
                  <Text style={styles.contactName}>{item.displayName}</Text>
                  <Text style={styles.contactStatus}>
                    {item.status === 'online' ? 'Online' : `Last seen ${item.lastSeen || 'recently'}`}
                  </Text>
                </View>
              </TouchableOpacity>

              {isCall && item._id !== user?._id && (
                <View style={styles.callButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.callActionIconBtn}
                    onPress={() => handleCallPress(item, 'audio')}
                  >
                    <Ionicons name="call-outline" size={22} color="#075E54" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.callActionIconBtn}
                    onPress={() => handleCallPress(item, 'video')}
                  >
                    <Ionicons name="videocam-outline" size={24} color="#075E54" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          loading ? (
            <ActivityIndicator size="large" color="#7E57C2" style={{ marginTop: 32 }} />
          ) : (
            <Text style={styles.emptyText}>No contacts found</Text>
          )
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
  listContent: {
    paddingBottom: 40,
  },
  actionItems: {
    paddingTop: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
    backgroundColor: '#F9F9F9',
    paddingVertical: 8,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  contactItem: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarPlaceholder: {
    backgroundColor: '#7E57C2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  contactStatus: {
    fontSize: 13,
    color: '#888',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
    fontSize: 16,
  },
  contactRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  callButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 24,
  },
  callActionIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
