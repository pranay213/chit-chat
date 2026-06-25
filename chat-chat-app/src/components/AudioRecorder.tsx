import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import Ionicons from '@expo/vector-icons/Ionicons';

function AudioPreviewPlayer({ uri, onCancel, onConfirm }: { uri: string, onCancel: () => void, onConfirm: () => void }) {
  const player = useAudioPlayer(uri);
  
  return (
      <View style={styles.recordingContainer}>
        <TouchableOpacity onPress={() => player.playing ? player.pause() : player.play()} style={styles.actionBtn}>
          <Ionicons name={player.playing ? "pause" : "play"} size={20} color="#00C853" />
        </TouchableOpacity>
        <Text style={[styles.durationText, { color: '#00C853' }]}>Preview</Text>
        
        <TouchableOpacity onPress={onCancel} style={styles.actionBtn}>
          <Ionicons name="trash" size={20} color="red" />
        </TouchableOpacity>

        <TouchableOpacity onPress={onConfirm} style={[styles.sendBtn, { backgroundColor: '#00C853' }]}>
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
  );
}

function ActiveAudioRecorder({ onSend, onCancel }: { onSend: (uri: string) => void, onCancel?: () => void }) {
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (recorder.isRecording && !isPaused) {
      interval = setInterval(() => {
        setDuration(Math.floor(recorder.currentTime || 0));
      }, 100);
    } else if (!recorder.isRecording) {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [recorder.isRecording, isPaused]);

  useEffect(() => {
    // Auto-start recording on mount since permissions are already handled
    const start = async () => {
      try {
        try {
          await recorder.prepareToRecordAsync();
        } catch (e) {
          console.log('Recorder may already be prepared:', e);
        }
        recorder.record();
      } catch (err) {
        console.error("Failed to start active recording", err);
      }
    };
    start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pauseRecording = () => {
    if (isPaused) {
      recorder.record();
      setIsPaused(false);
    } else {
      recorder.pause();
      setIsPaused(true);
    }
  };

  const stopRecordingForPreview = async () => {
    try {
      await recorder.stop();
    } catch(e) {}
    
    if (recorder.uri) {
      setPreviewUri(recorder.uri);
    }
  };

  const confirmAndSend = () => {
    if (previewUri) {
      onSend(previewUri);
    }
    setPreviewUri(null);
    setDuration(0);
  };

  const cancelRecording = async () => {
    try {
      await recorder.stop();
    } catch(e) {}
    
    setPreviewUri(null);
    setDuration(0);
    if (onCancel) {
      onCancel();
    }
  };

  if (previewUri) {
    return <AudioPreviewPlayer uri={previewUri} onCancel={cancelRecording} onConfirm={confirmAndSend} />;
  }

  return (
    <View style={styles.recordingContainer}>
      <Text style={styles.durationText}>
        {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
      </Text>
      
      <TouchableOpacity onPress={pauseRecording} style={styles.actionBtn}>
        <Ionicons name={isPaused ? "play" : "pause"} size={20} color="black" />
      </TouchableOpacity>

      <TouchableOpacity onPress={cancelRecording} style={styles.actionBtn}>
        <Ionicons name="trash" size={20} color="red" />
      </TouchableOpacity>

      <TouchableOpacity onPress={stopRecordingForPreview} style={styles.sendBtn}>
        <Ionicons name="stop" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
}

export default function AudioRecorder({ onSend, onCancel }: { onSend: (uri: string) => void, onCancel?: () => void }) {
  const [isReadyToRecord, setIsReadyToRecord] = useState(false);

  const prepareAndStart = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (permission.status !== 'granted') return;

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      setIsReadyToRecord(true);
    } catch (err) {
      console.error('Failed to prepare audio mode', err);
    }
  };

  if (!isReadyToRecord) {
    return (
      <TouchableOpacity onPress={prepareAndStart} style={styles.micBtn}>
        <Ionicons name="mic" size={24} color="white" />
      </TouchableOpacity>
    );
  }

  return <ActiveAudioRecorder onSend={onSend} onCancel={onCancel} />;
}

const styles = StyleSheet.create({
  micBtn: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 25,
    gap: 15,
  },
  durationText: {
    color: 'red',
    fontWeight: 'bold',
    minWidth: 40,
  },
  actionBtn: {
    padding: 5,
  },
  sendBtn: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 20,
    marginLeft: 'auto',
  },
});
