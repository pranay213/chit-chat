import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// Fallback for icons if vector-icons is not immediately available, though it usually is in Expo
import Ionicons from '@expo/vector-icons/Ionicons';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.langSelector}>
          <Text style={styles.langText}>EN</Text>
          <Ionicons name="chevron-down" size={16} color="#000" />
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubble-ellipses" size={40} color="#7E57C2" />
        </View>
        
        <Text style={styles.title}>Chat freely,{'\n'}connect deeply.</Text>
        
        <Text style={styles.subtitle}>
          A fast, secure and simple way{'\n'}to talk with anyone, anywhere.
        </Text>
      </View>

      {/* Illustration */}
      <View style={styles.illustrationContainer}>
        <Image 
          source={require('../../assets/images/welcome_illustration.png')} 
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/login')} // Navigation for later
        >
          <Text style={styles.buttonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" style={styles.buttonIcon} />
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.loginText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Soft off-white matching the design
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 16,
  },
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  langText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
    color: '#333',
  },
  content: {
    paddingHorizontal: 32,
    marginTop: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3E5F5', // Light purple bg
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A1A1A',
    lineHeight: 44,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  illustration: {
    width: '100%',
    height: '100%',
    maxHeight: 300,
  },
  bottomSection: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 40 : 32,
  },
  button: {
    backgroundColor: '#7E57C2', // Deep purple matching the design
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 24,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    position: 'absolute',
    right: 24,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 15,
  },
  loginText: {
    color: '#7E57C2',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
