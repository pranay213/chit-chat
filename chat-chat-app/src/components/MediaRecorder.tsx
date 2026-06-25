import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Image, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function MediaRecorder({ visible, onClose, onMediaCaptured }: { visible: boolean, onClose: () => void, onMediaCaptured: (uri: string, type: 'video' | 'photo') => void }) {
  const [camStatus, requestCamPermission] = useCameraPermissions();
  const [micStatus, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [isHD, setIsHD] = useState(true);
  const [zoom, setZoom] = useState(0);
  const [cameraMode, setCameraMode] = useState<'picture' | 'video'>('picture');
  const [previewMedia, setPreviewMedia] = useState<{ uri: string, type: 'photo' | 'video' } | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const cameraRef = useRef<CameraView>(null);

  if (!camStatus || !micStatus) {
    return <View />;
  }

  if (!camStatus.granted || !micStatus.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
          <TouchableOpacity onPress={() => { requestCamPermission(); requestMicPermission(); }} style={styles.btn}>
            <Text style={styles.btnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.btn}>
            <Text style={styles.btnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: isHD ? 1 : 0.5,
      });
      if (photo) {
        setPreviewMedia({ uri: photo.uri, type: 'photo' });
      }
    }
  };

  const toggleRecordVideo = async () => {
    if (isRecording) {
      cameraRef.current?.stopRecording();
      setIsRecording(false);
      setCameraMode('picture');
    } else {
      setCameraMode('video');
      setIsRecording(true);
      // Wait for mode to switch before recording
      setTimeout(async () => {
        if (cameraRef.current) {
          try {
            const video = await cameraRef.current.recordAsync();
            if (video) {
              setPreviewMedia({ uri: video.uri, type: 'video' });
            }
          } catch (err) {
            console.log("Failed to record", err);
          }
        }
      }, 500);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {previewMedia ? (
          <View style={StyleSheet.absoluteFill}>
            <Image source={{ uri: previewMedia.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
            
            {/* Dark overlay for video indicator if needed */}
            {previewMedia.type === 'video' && (
              <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                <Ionicons name="play-circle" size={80} color="white" />
              </View>
            )}

            <SafeAreaView style={styles.previewControlsContainer}>
              <View style={styles.previewControls}>
                <TouchableOpacity style={styles.previewBtnRetake} onPress={() => setPreviewMedia(null)}>
                  <Ionicons name="trash-outline" size={24} color="#FFF" />
                  <Text style={styles.previewBtnText}>Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.previewBtnSend} onPress={() => {
                  onMediaCaptured(previewMedia.uri, previewMedia.type);
                  setPreviewMedia(null);
                  onClose();
                }}>
                  <Text style={styles.previewBtnText}>Send</Text>
                  <Ionicons name="send" size={20} color="#FFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        ) : (
          <>
            {/* CameraView must have NO children — overlay controls sit in sibling View */}
            <CameraView style={StyleSheet.absoluteFill} facing={facing} ref={cameraRef} zoom={zoom} mode={cameraMode} />

            {/* Absolutely-positioned overlay — no children inside CameraView */}
            <View style={styles.overlay} pointerEvents="box-none">
              
              {isRecording && (
                <View style={styles.recordingTimerContainer}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingTimerText}>
                    {Math.floor(recordDuration / 60).toString().padStart(2, '0')}:{(recordDuration % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              )}

              <View style={styles.topControls}>
                <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
                  <Ionicons name="close" size={30} color="white" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconBtn} onPress={() => setIsHD(!isHD)}>
                  <Text style={styles.hdText}>{isHD ? 'HD' : 'SD'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconBtn} onPress={() => setZoom(zoom === 0 ? 0.5 : 0)}>
                  <Ionicons name="search" size={24} color={zoom > 0 ? '#007AFF' : 'white'} />
                </TouchableOpacity>
              </View>

              <View style={styles.bottomControls}>
                <TouchableOpacity style={styles.iconBtn} onPress={toggleCameraFacing}>
                  <Ionicons name="camera-reverse" size={40} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.captureBtn, isRecording && styles.recordingBtn]}
                  onPress={() => {
                    if (isRecording) {
                      toggleRecordVideo();
                    } else {
                      takePicture();
                    }
                  }}
                  onLongPress={() => {
                    if (!isRecording) {
                      toggleRecordVideo();
                    }
                  }}
                  delayLongPress={400}
                >
                  <View style={[styles.innerCaptureBtn, isRecording && styles.innerRecordingBtn]} />
                </TouchableOpacity>

                {/* Filter icon placeholder */}
                <TouchableOpacity style={styles.iconBtn}>
                  <Ionicons name="color-wand" size={30} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'black'
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  btn: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    marginTop: 10
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold'
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
  },
  iconBtn: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
  },
  hdText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingBtn: {
    backgroundColor: 'rgba(255,0,0,0.3)',
  },
  innerCaptureBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  innerRecordingBtn: {
    width: 30,
    height: 30,
    borderRadius: 5,
    backgroundColor: 'red',
  },
  recordingTimerContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
    marginRight: 8,
  },
  recordingTimerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewControlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  previewControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  previewBtnRetake: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
  },
  previewBtnSend: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C853',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  previewBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
