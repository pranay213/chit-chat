import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system';
import Ionicons from '@expo/vector-icons/Ionicons';

export interface FileData {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export default function FileViewer({ file, onRemove }: { file: FileData, onRemove?: () => void }) {
  const openFile = async () => {
    try {
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(file.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: file.mimeType,
        });
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, {
            UTI: file.mimeType,
            dialogTitle: `Open ${file.name}`,
          });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open this file type. Please make sure you have a compatible app installed.');
    }
  };

  const getIcon = () => {
    if (file.mimeType.includes('pdf')) return 'document-text';
    if (file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet')) return 'stats-chart';
    if (file.mimeType.includes('image')) return 'image';
    if (file.mimeType.includes('video')) return 'videocam';
    if (file.mimeType.includes('audio')) return 'musical-notes';
    if (file.name.endsWith('.apk')) return 'logo-android';
    return 'document';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.fileButton} onPress={openFile}>
        <Ionicons name={getIcon() as any} size={32} color="#007AFF" />
        <View style={styles.textContainer}>
          <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
          <Text style={styles.fileSize}>
            {file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'}
          </Text>
        </View>
      </TouchableOpacity>
      {onRemove && (
        <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
          <Ionicons name="close-circle" size={24} color="#FF3B30" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 10,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 10,
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  fileSize: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  removeButton: {
    padding: 5,
  },
});
