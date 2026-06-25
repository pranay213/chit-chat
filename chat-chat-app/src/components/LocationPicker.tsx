import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// @ts-ignore
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap Contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 22 }],
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onShareLocation: (lat: number, lng: number, isLive: boolean, durationHours?: number) => void;
}

export default function LocationPicker({ visible, onClose, onShareLocation }: Props) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('Fetching location...');
  const [isLive, setIsLive] = useState(true);
  const [duration, setDuration] = useState<number>(1); // 1, 8, or 0 (Always)
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!visible) return;

    (async () => {
      setLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setAddress('Location permission denied');
          setLoading(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        setSelectedLocation(coords);

        // Reverse geocode for address display
        try {
          const geo = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
          if (geo && geo[0]) {
            const g = geo[0];
            const parts = [g.name, g.street, g.city, g.region].filter(Boolean);
            setAddress(parts.join(', ') || 'Current Location');
          } else {
            setAddress('Current Location');
          }
        } catch {
          setAddress('Current Location');
        }
      } catch (e) {
        setAddress('Unable to get location');
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const handleMapPress = async (e: any) => {
    const coords = e.geometry?.coordinates;
    if (!coords) return;
    const [lng, lat] = coords;
    setSelectedLocation({ lat, lng });

    // Fly camera to tapped location using correct MapLibre v11 API
    cameraRef.current?.flyTo({
      center: [lng, lat] as [number, number],
      zoom: 15,
      duration: 600,
    });

    // Reverse geocode selected location
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geo && geo[0]) {
        const g = geo[0];
        const parts = [g.name, g.street, g.city, g.region].filter(Boolean);
        setAddress(parts.join(', ') || 'Selected Location');
      } else {
        setAddress('Selected Location');
      }
    } catch {
      setAddress('Selected Location');
    }
  };

  const handleShare = () => {
    if (!selectedLocation) return;
    onShareLocation(selectedLocation.lat, selectedLocation.lng, isLive, duration);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share Location</Text>
          <View style={{ width: 44 }} />
        </View>

        {loading || !location ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#7E57C2" />
            <Text style={styles.loaderText}>Getting your location...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Map */}
            <Map
              style={styles.map}
              mapStyle={OSM_STYLE}
              onPress={handleMapPress}
            >
              <Camera
                ref={cameraRef}
                initialViewState={{
                  center: [location.lng, location.lat] as [number, number],
                  zoom: 18,
                }}
              />

              {selectedLocation && (
                <Marker
                  id="selected-location"
                  lngLat={[selectedLocation.lng, selectedLocation.lat]}
                >
                  <View style={styles.pinContainer}>
                    <View style={styles.pinDot} />
                    <View style={styles.pinStem} />
                  </View>
                </Marker>
              )}

              {/* Blue dot for current location */}
              <Marker
                id="current-location"
                lngLat={[location.lng, location.lat]}
              >
                <View style={styles.currentLocationDot}>
                  <View style={styles.currentLocationInner} />
                </View>
              </Marker>
            </Map>

            {/* "Tap to change" hint */}
            <View style={styles.hintBadge}>
              <Ionicons name="hand-left-outline" size={14} color="#555" />
              <Text style={styles.hintText}>Tap map to pick a different location</Text>
            </View>

            {/* Bottom panel */}
            <View style={styles.bottomPanel}>
              <View style={styles.locationRow}>
                <View style={styles.locationIconCircle}>
                  <Ionicons name="navigate" size={20} color="#7E57C2" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationTitle} numberOfLines={1}>
                    {selectedLocation && location &&
                      selectedLocation.lat === location.lat &&
                      selectedLocation.lng === location.lng
                      ? 'My Current Location'
                      : 'Selected Location'}
                  </Text>
                  <Text style={styles.locationAddress} numberOfLines={2}>{address}</Text>
                  <Text style={styles.locationCoords}>
                    {selectedLocation?.lat.toFixed(5)}, {selectedLocation?.lng.toFixed(5)}
                  </Text>
                </View>
              </View>

              <View style={styles.segmentedControl}>
                <TouchableOpacity 
                  style={[styles.segmentBtn, !isLive && styles.segmentBtnActive]} 
                  onPress={() => setIsLive(false)}
                >
                  <Ionicons name="pin" size={16} color={!isLive ? "#FFF" : "#7E57C2"} />
                  <Text style={[styles.segmentText, !isLive && styles.segmentTextActive]}>Static</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.segmentBtn, isLive && styles.segmentBtnActive]} 
                  onPress={() => setIsLive(true)}
                >
                  <Ionicons name="navigate" size={16} color={isLive ? "#FFF" : "#7E57C2"} />
                  <Text style={[styles.segmentText, isLive && styles.segmentTextActive]}>Live Location</Text>
                </TouchableOpacity>
              </View>

              {isLive && (
                <View style={styles.durationContainer}>
                  <Text style={styles.durationTitle}>Share for:</Text>
                  <View style={styles.durationRow}>
                    <TouchableOpacity style={[styles.durationChip, duration === 1 && styles.durationChipActive]} onPress={() => setDuration(1)}>
                      <Text style={[styles.durationText, duration === 1 && styles.durationTextActive]}>1 Hour</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.durationChip, duration === 8 && styles.durationChipActive]} onPress={() => setDuration(8)}>
                      <Text style={[styles.durationText, duration === 8 && styles.durationTextActive]}>8 Hours</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.durationChip, duration === 0 && styles.durationChipActive]} onPress={() => setDuration(0)}>
                      <Text style={[styles.durationText, duration === 0 && styles.durationTextActive]}>Always</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Ionicons name="send" size={20} color="#FFF" />
                <Text style={styles.shareBtnText}>{isLive ? 'Start Sharing' : 'Send Location'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  closeBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loaderText: {
    fontSize: 15,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  hintBadge: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#444',
  },
  pinContainer: {
    alignItems: 'center',
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7E57C2',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#7E57C2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  pinStem: {
    width: 3,
    height: 10,
    backgroundColor: '#7E57C2',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  currentLocationDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(33, 150, 243, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  bottomPanel: {
    backgroundColor: '#FFF',
    padding: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 20,
    marginTop: -20, // Overlap the map slightly
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 20,
  },
  locationIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  locationAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  locationCoords: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F0FF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#7E57C2',
    shadowColor: '#7E57C2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: 14,
    color: '#7E57C2',
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFF',
  },
  durationContainer: {
    marginBottom: 16,
  },
  durationTitle: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
    fontWeight: '600',
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  durationChipActive: {
    backgroundColor: '#7E57C2',
    borderColor: '#7E57C2',
  },
  durationText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  durationTextActive: {
    color: '#FFF',
  },
  shareBtn: {
    backgroundColor: '#7E57C2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
  },
  shareBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
