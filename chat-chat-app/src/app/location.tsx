import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, useColorScheme } from 'react-native';
// @ts-ignore
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';

// MapLibre is initialized inside the component to avoid native bridge issues

const lightStyle = {
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
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

// Simplified dark style for raster tiles (CSS filters aren't natively supported, so we just use standard OSM for now)
const darkStyle = lightStyle;

export default function LocationScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [is3D, setIs3D] = useState(false);
  const [isTraffic, setIsTraffic] = useState(false);

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        return;
      }

      const initialLocation = await Location.getCurrentPositionAsync({});
      setLocation(initialLocation);
      setSpeed(initialLocation.coords.speed || 0);

      let lastCoords: { latitude: number, longitude: number } | null = null;
      let totalDistance = 0;

      const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
      };

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (newLocation) => {
          setLocation(newLocation);
          setSpeed(newLocation.coords.speed || 0);

          if (lastCoords) {
            const dist = getDistanceFromLatLonInKm(
              lastCoords.latitude, lastCoords.longitude,
              newLocation.coords.latitude, newLocation.coords.longitude
            );
            totalDistance += dist;
            setDistance(totalDistance);
          }
          lastCoords = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude
          };
        }
      );
    };

    startTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Fly camera to user's location whenever it updates
  useEffect(() => {
    if (!location) return;
    cameraRef.current?.flyTo({
      center: [location.coords.longitude, location.coords.latitude] as [number, number],
      zoom: 15,
      duration: 800,
    });
  }, [location]);

  return (
    <View style={styles.container}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <Map
        style={styles.map}
        mapStyle={isDarkMode ? darkStyle : lightStyle}
        pitchEnabled={true}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: location
              ? ([location.coords.longitude, location.coords.latitude] as [number, number])
              : ([0, 0] as [number, number]),
            zoom: 15,
            pitch: is3D ? 60 : 0,
          }}
        />
        {location && (
          <Marker
            id="user-location"
            lngLat={[location.coords.longitude, location.coords.latitude]}
          >
            <View style={styles.markerContainer}>
              <View style={styles.markerDot} />
            </View>
          </Marker>
        )}
      </Map>

      <View style={[styles.panel, isDarkMode && styles.panelDark]}>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, isDarkMode && styles.textDark]}>Speed</Text>
            <Text style={[styles.statValue, isDarkMode && styles.textDark]}>
              {(speed * 3.6).toFixed(1)} km/h
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, isDarkMode && styles.textDark]}>Distance</Text>
            <Text style={[styles.statValue, isDarkMode && styles.textDark]}>
              {distance.toFixed(2)} km
            </Text>
          </View>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.btn, is3D && styles.btnActive]}
            onPress={() => setIs3D(!is3D)}
          >
            <Ionicons name="cube-outline" size={24} color={is3D ? "#fff" : (isDarkMode ? "#fff" : "#000")} />
            <Text style={[styles.btnText, is3D && styles.btnTextActive, isDarkMode && !is3D && styles.textDark]}>
              3D View
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, isTraffic && styles.btnActive]}
            onPress={() => setIsTraffic(!isTraffic)}
          >
            <Ionicons name="car-outline" size={24} color={isTraffic ? "#fff" : (isDarkMode ? "#fff" : "#000")} />
            <Text style={[styles.btnText, isTraffic && styles.btnTextActive, isDarkMode && !isTraffic && styles.textDark]}>
              Traffic
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    borderWidth: 1,
    borderColor: 'white',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  panelDark: {
    backgroundColor: '#1E1E1E',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  textDark: {
    color: '#FFF',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  btnActive: {
    backgroundColor: '#007AFF',
  },
  btnText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  btnTextActive: {
    color: '#FFF',
  },
});
