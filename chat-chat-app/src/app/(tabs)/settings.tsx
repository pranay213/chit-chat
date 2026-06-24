import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  Modal, 
  TextInput, 
  ScrollView, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, token, logout, updateUserLocal, refreshUser } = useAuth();

  // Refresh profile data from server whenever this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [token])
  );


  const [modalVisible, setModalVisible] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [slogan, setSlogan] = useState('');
  const [gender, setGender] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setProfileImage(user.profileImage || '');
      setSlogan(user.slogan || '');
      setGender(user.gender || '');
      setUsername(user.username || '');
    }
  }, [user, modalVisible]);

  useEffect(() => {
    if (!token || !username || username.trim().length < 3 || username.trim().toLowerCase() === user?.username?.toLowerCase()) {
      setIsUsernameAvailable(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const res = await api.checkUsernameAvailability(username.trim(), token);
        const data = res.data || res;
        setIsUsernameAvailable(data.available);
      } catch (err) {
        console.log('Failed to check username availability:', err);
        setIsUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [username, token, user]);

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleSelectAndUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your photo library to set your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setUploadingImage(true);
        const fileUri = result.assets[0].uri;
        
        if (!token) return;
        const uploadRes = await api.uploadMedia(fileUri, token);
        const data = uploadRes.data || uploadRes;
        
        if (data.success && data.url) {
          setProfileImage(data.url);
          Alert.alert('Uploaded', 'Profile image uploaded successfully. Click Save to save the changes.');
        } else {
          Alert.alert('Upload Failed', 'Server did not return a valid file URL.');
        }
      }
    } catch (err: any) {
      console.log('Error selecting/uploading image:', err);
      Alert.alert('Error', err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const handleSaveProfile = async () => {
    if (!user?._id || !token) return;
    setLoading(true);
    try {
      const res = await api.updateProfile(user._id, token, {
        displayName: displayName.trim(),
        profileImage: profileImage.trim(),
        slogan: slogan.trim(),
        gender: gender.trim(),
        username: username.trim(),
      });
      
      const updatedUser = res.user || res.data?.user || res.data;
      if (updatedUser) {
        await updateUserLocal(updatedUser);
        // Re-fetch from server to ensure we have the freshest copy (incl. profileImage URL)
        await refreshUser();
        Alert.alert('Success', 'Profile updated successfully!');
        setModalVisible(false);
      } else {
        Alert.alert('Error', 'Failed to retrieve updated user profile');
      }
    } catch (err: any) {
      console.log('Error updating profile:', err);
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile Card */}
        <TouchableOpacity 
          style={styles.profileSection}
          onPress={async () => {
            await refreshUser();
            setModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profileDetails}>
            <View style={styles.profileHeaderRow}>
              <Text style={styles.displayName}>{user?.displayName || user?.mobileNumber || user?.email || 'Chat User'}</Text>
              <Ionicons name="create-outline" size={18} color="#7E57C2" />
            </View>
            {user?.username ? (
              <Text style={styles.identifier}>@{user.username}</Text>
            ) : null}
            <Text style={styles.identifier}>{user?.email || user?.mobileNumber || ''}</Text>
            {user?.slogan ? (
              <Text style={styles.sloganText} numberOfLines={1}>{user.slogan}</Text>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Account Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Account</Text>
        </View>
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Mobile Number', user?.mobileNumber || 'No number linked')}>
            <Ionicons name="phone-portrait-outline" size={22} color="#555" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Phone Number</Text>
              <Text style={styles.menuSubtitle}>{user?.mobileNumber || 'Not linked'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Email', user?.email || 'No email linked')}>
            <Ionicons name="mail-outline" size={22} color="#555" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Email</Text>
              <Text style={styles.menuSubtitle}>{user?.email || 'Not linked'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Username', user?.username ? `@${user.username}` : 'No username set')}>
            <Ionicons name="at-outline" size={22} color="#555" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Username</Text>
              <Text style={styles.menuSubtitle}>{user?.username ? `@${user.username}` : 'Not set'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>
        </View>

        {/* Security Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Security</Text>
        </View>
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Two-Step Verification', 'Two-step verification adds an extra layer of security to your account.')}>
            <Ionicons name="lock-closed-outline" size={22} color="#555" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Two-Step Verification</Text>
              <Text style={styles.menuSubtitle}>Off</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Change Password', 'Password change feature coming soon.')}>
            <Ionicons name="key-outline" size={22} color="#555" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Change Password</Text>
              <Text style={styles.menuSubtitle}>Update your login password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/settings' as any)}>
            <Ionicons name="phone-portrait-outline" size={22} color="#555" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Active Sessions</Text>
              <Text style={styles.menuSubtitle}>View and revoke devices</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => Alert.alert('Blocked Contacts', 'No blocked contacts.')}>
            <Ionicons name="ban-outline" size={22} color="#555" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Blocked Contacts</Text>
              <Text style={styles.menuSubtitle}>Manage blocked users</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>
        </View>

        {/* Privacy Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Privacy</Text>
        </View>
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Last Seen', 'Control who can see your last seen status.')}>
            <Ionicons name="time-outline" size={22} color="#555" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Last Seen & Online</Text>
              <Text style={styles.menuSubtitle}>Everyone</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Profile Photo', 'Control who can see your profile photo.')}>
            <Ionicons name="image-outline" size={22} color="#555" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Profile Photo</Text>
              <Text style={styles.menuSubtitle}>Everyone</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('About', 'Control who can see your about/slogan.')}>
            <Ionicons name="information-circle-outline" size={22} color="#555" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>About</Text>
              <Text style={styles.menuSubtitle}>Everyone</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Status', 'Control who can see your status updates.')}>
            <Ionicons name="ellipse-outline" size={22} color="#555" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Status</Text>
              <Text style={styles.menuSubtitle}>My contacts</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => Alert.alert('Read Receipts', 'When turned off, you cannot see read receipts for other people.')}>
            <Ionicons name="checkmark-done-outline" size={22} color="#555" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Read Receipts</Text>
              <Text style={styles.menuSubtitle}>On</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>
        </View>

        {/* Chats, Notifications, Help */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>App Settings</Text>
        </View>
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Chats', 'Theme, wallpaper, and chat history options.')}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#555" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Chats</Text>
              <Text style={styles.menuSubtitle}>Theme, wallpapers, chat history</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Notifications', 'Customize notification sounds and alerts.')}>
            <Ionicons name="notifications-outline" size={22} color="#555" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Notifications</Text>
              <Text style={styles.menuSubtitle}>Message, group & call tones</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => Alert.alert('Help', 'Help center, contact us, privacy policy.')}>
            <Ionicons name="help-circle-outline" size={22} color="#555" style={styles.menuIcon} />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Help</Text>
              <Text style={styles.menuSubtitle}>FAQ, contact support</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar style="dark" />
          
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity 
              onPress={handleSaveProfile} 
              disabled={loading || checkingUsername || isUsernameAvailable === false || (username.trim().length > 0 && username.trim().length < 3)} 
              style={[
                styles.modalSaveBtn, 
                (loading || checkingUsername || isUsernameAvailable === false || (username.trim().length > 0 && username.trim().length < 3)) && { opacity: 0.5 }
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#7E57C2" />
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            {/* Avatar Section */}
            <View style={styles.modalAvatarContainer}>
              <View style={styles.largeAvatarWrapper}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.modalLargeAvatar} />
                ) : (
                  <View style={[styles.modalLargeAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.modalLargeAvatarText}>
                      {displayName ? displayName.substring(0, 2).toUpperCase() : 'U'}
                    </Text>
                  </View>
                )}
                {uploadingImage && (
                  <View style={[styles.modalLargeAvatar, styles.avatarLoadingOverlay]}>
                    <ActivityIndicator size="small" color="#FFF" />
                  </View>
                )}
                
                {/* Upload Button */}
                <TouchableOpacity 
                  style={styles.uploadAvatarBtn}
                  onPress={handleSelectAndUploadImage}
                  disabled={uploadingImage}
                >
                  <Ionicons name="camera-outline" size={16} color="#FFF" />
                </TouchableOpacity>

                {/* Remove Button */}
                {profileImage ? (
                  <TouchableOpacity 
                    style={styles.removeAvatarBtn}
                    onPress={() => {
                      Alert.alert(
                        'Remove Image',
                        'Are you sure you want to remove your profile image?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => setProfileImage('') }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash-outline" size={14} color="#FFF" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Form Fields */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Display Name</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Enter display name"
                placeholderTextColor="#999"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Username</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  isUsernameAvailable === false && { borderColor: '#FF3B30' },
                  isUsernameAvailable === true && { borderColor: '#34C759' }
                ]}
                placeholder="Enter unique username"
                placeholderTextColor="#999"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              {checkingUsername && (
                <Text style={styles.usernameIndicatorChecking}>Checking availability...</Text>
              )}
              {isUsernameAvailable === true && (
                <Text style={styles.usernameIndicatorAvailable}>✓ Username is available</Text>
              )}
              {isUsernameAvailable === false && (
                <Text style={styles.usernameIndicatorTaken}>✗ Username is already taken</Text>
              )}
              {username.trim().length > 0 && username.trim().length < 3 && (
                <Text style={styles.usernameIndicatorError}>Username must be at least 3 characters</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Bio / Slogan</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Enter slogan"
                placeholderTextColor="#999"
                value={slogan}
                onChangeText={setSlogan}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.genderOptions}>
                {['Male', 'Female', 'Other'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderBtn,
                      gender.toLowerCase() === g.toLowerCase() && styles.genderBtnActive
                    ]}
                    onPress={() => setGender(g.toLowerCase())}
                  >
                    <Text 
                      style={[
                        styles.genderBtnText,
                        gender.toLowerCase() === g.toLowerCase() && styles.genderBtnTextActive
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    backgroundColor: '#7E57C2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  identifier: {
    fontSize: 14,
    color: '#666',
  },
  menuSection: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F9F9F9',
  },
  menuIcon: {
    marginRight: 20,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  logoutSection: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFEBEA',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sloganText: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7E57C2',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSaveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7E57C2',
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalAvatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalLargeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  modalLargeAvatarText: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  genderBtnActive: {
    borderColor: '#7E57C2',
    backgroundColor: '#F3E5F5',
  },
  genderBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  genderBtnTextActive: {
    color: '#7E57C2',
  },
  largeAvatarWrapper: {
    position: 'relative',
  },
  removeAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: '#FF3B30',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  uploadAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#7E57C2',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usernameIndicatorChecking: {
    fontSize: 12,
    color: '#7E57C2',
    marginTop: 4,
    fontWeight: '600',
  },
  usernameIndicatorAvailable: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 4,
    fontWeight: '600',
  },
  usernameIndicatorTaken: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    fontWeight: '600',
  },
  usernameIndicatorError: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontWeight: '500',
  },
});
