import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { sendOtpCode, loginWithPasswordCode, isLoading } = useAuth();
  const [loginMode, setLoginMode] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim()) {
      Alert.alert('Error', `Please enter your ${loginMode === 'email' ? 'email' : 'phone number'}`);
      return;
    }

    if (loginMode === 'email' && !password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    try {
      if (loginMode === 'email') {
        // Email & Password login flow
        await loginWithPasswordCode({
          email: identifier.trim().toLowerCase(),
          password: password.trim()
        });
        // Success redirect will be handled by AuthContext route guards automatically
      } else {
        // Phone & OTP login flow
        const payload = { mobileNumber: identifier.trim() };
        await sendOtpCode(payload);
        
        // Navigate to OTP Verification
        router.push({
          pathname: '/verify',
          params: { 
            isRegister: 'false',
            identifier: identifier.trim(),
          }
        });
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Something went wrong');
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
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          </View>
     
          <View style={styles.content}>
            <Text style={styles.title}>Welcome back! 👋</Text>
            <Text style={styles.subtitle}>Login to continue your chats</Text>

            {/* Custom Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity 
                style={[styles.tabButton, loginMode === 'email' && styles.tabButtonActive]}
                onPress={() => {
                  setLoginMode('email');
                  setIdentifier('');
                  setPassword('');
                }}
              >
                <Text style={[styles.tabButtonText, loginMode === 'email' && styles.tabButtonTextActive]}>
                  Email & Password
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, loginMode === 'phone' && styles.tabButtonActive]}
                onPress={() => {
                  setLoginMode('phone');
                  setIdentifier('');
                  setPassword('');
                }}
              >
                <Text style={[styles.tabButtonText, loginMode === 'phone' && styles.tabButtonTextActive]}>
                  Phone & OTP
                </Text>
              </TouchableOpacity>
            </View>
     
            <View style={styles.formContainer}>
              {/* Identifier Input */}
              <View style={styles.inputContainer}>
                <Ionicons 
                  name={loginMode === 'email' ? "mail-outline" : "call-outline"} 
                  size={20} 
                  color="#666" 
                  style={styles.inputIcon} 
                />
                <TextInput 
                  style={styles.input}
                  placeholder={loginMode === 'email' ? "Email address" : "Phone number"}
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  value={identifier}
                  onChangeText={setIdentifier}
                  keyboardType={loginMode === 'email' ? 'email-address' : 'phone-pad'}
                />
              </View>
     
              {/* Password Input (Only shown in Email Mode) */}
              {loginMode === 'email' && (
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
     
              {loginMode === 'email' && (
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
     
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>
                      {loginMode === 'email' ? 'Login' : 'Send OTP'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" style={styles.buttonIcon} />
                  </>
                )}
              </TouchableOpacity>
            </View>
     
            {/* Social Login Options */}
            <View style={styles.socialSection}>
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.divider} />
              </View>
     
              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-google" size={24} color="#DB4437" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-apple" size={24} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-facebook" size={24} color="#4267B2" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
     
          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.signupText}>Sign up</Text>
            </TouchableOpacity>
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
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  tabButtonTextActive: {
    color: '#7E57C2',
    fontWeight: '700',
  },
  formContainer: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  forgotPasswordText: {
    color: '#7E57C2',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#7E57C2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 16,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    position: 'absolute',
    right: 24,
  },
  socialSection: {
    marginTop: 40,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#EFEFEF',
  },
  dividerText: {
    color: '#999',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialButton: {
    width: 60,
    height: 60,
    backgroundColor: '#FFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 32,
  },
  footerText: {
    color: '#666',
    fontSize: 15,
  },
  signupText: {
    color: '#7E57C2',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
