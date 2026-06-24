import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';

import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isRegister = params.isRegister === 'true';
  const identifier = (params.identifier as string) || '';

  const { verifyOtpCode, isLoading } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputs = useRef<Array<TextInput | null>>([]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpValue = code.join('');
    if (otpValue.length !== 6) {
      Alert.alert('Error', 'Please enter the full 6-digit code');
      return;
    }

    try {
      await verifyOtpCode(otpValue, isRegister);
      Alert.alert('Success', 'Verification successful!', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to explore screen or main app dashboard
            router.replace('/chats');
          }
        }
      ]);
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Incorrect OTP code');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <View style={styles.shieldBg}>
                <Ionicons name="shield-checkmark" size={60} color="#FFF" />
              </View>
            </View>

            <Text style={styles.title}>Verify your number</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to
            </Text>
            
            <View style={styles.phoneBadge}>
              <Text style={styles.phoneText}>{identifier}</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputs.current[index] = ref; }}
                  style={[
                    styles.codeInput,
                    digit ? styles.codeInputActive : null,
                    index === 0 && !digit ? styles.codeInputFocused : null
                  ]}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.resendContainer}>
              <Text style={styles.resendText}>Resend code in <Text style={styles.timerText}>00:45</Text></Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.verifyButton}
              onPress={handleVerify}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" style={styles.buttonIcon} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.secureFooter}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#7E57C2" />
              <Text style={styles.secureText}>
                Your verification code is secure{'\n'}and will expire shortly.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  topBar: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  iconContainer: {
    marginBottom: 40,
  },
  shieldBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#9575CD', // Matching the purple shield color
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7E57C2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 40,
    gap: 12,
  },
  phoneText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7E57C2',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 12,
    backgroundColor: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  codeInputActive: {
    borderColor: '#7E57C2',
    backgroundColor: '#F3E5F5',
    color: '#7E57C2',
  },
  codeInputFocused: {
    borderColor: '#7E57C2',
  },
  resendContainer: {
    marginBottom: 40,
  },
  resendText: {
    color: '#666',
    fontSize: 14,
  },
  timerText: {
    color: '#7E57C2',
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#7E57C2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    width: '100%',
    marginBottom: 40,
  },
  verifyButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    position: 'absolute',
    right: 24,
  },
  secureFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  secureText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
  },
});
