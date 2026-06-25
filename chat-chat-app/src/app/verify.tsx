import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

const MAX_ATTEMPTS = 3;
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isRegister = params.isRegister === 'true';
  const identifier = (params.identifier as string) || '';

  const { verifyOtpCode, sendOtpCode, isLoading } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputs = useRef<Array<TextInput | null>>([]);

  // Attempt state
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState('');

  // Resend timer
  const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Shake animation for wrong OTP
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Countdown timer ──────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    setResendCountdown(RESEND_COOLDOWN);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startCountdown();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Shake animation ──────────────────────────────────────────────────
  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  // ── Input handlers ───────────────────────────────────────────────────
  const handleCodeChange = (text: string, index: number) => {
    if (isLocked) return;
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

  const clearCode = () => {
    setCode(['', '', '', '', '', '']);
    setTimeout(() => inputs.current[0]?.focus(), 50);
  };

  // ── Verify OTP ───────────────────────────────────────────────────────
  const handleVerify = async () => {
    const otpValue = code.join('');
    if (otpValue.length !== 6) {
      Alert.alert('Incomplete Code', 'Please enter the full 6-digit code.');
      return;
    }
    if (isLocked) return;

    try {
      await verifyOtpCode(otpValue, isRegister);
      // Success — navigate
      router.replace('/chats');
    } catch (err: any) {
      const msg: string = err.message || '';
      const attemptsLeftFromServer: number | undefined = err.attemptsLeft;
      const locked: boolean = err.locked === true || err.status === 423;

      triggerShake();
      clearCode();

      if (locked) {
        setIsLocked(true);
        setAttemptsLeft(0);
        setLockMessage(
          'Too many incorrect attempts.\nPlease wait 10 minutes or request a new OTP.'
        );
      } else {
        const remaining =
          typeof attemptsLeftFromServer === 'number'
            ? attemptsLeftFromServer
            : Math.max(0, attemptsLeft - 1);
        setAttemptsLeft(remaining);
        if (remaining === 0) {
          setIsLocked(true);
          setLockMessage(
            'Too many incorrect attempts.\nPlease wait 10 minutes or request a new OTP.'
          );
        } else {
          Alert.alert(
            'Incorrect Code',
            `Wrong OTP. You have ${remaining} attempt${remaining !== 1 ? 's' : ''} left.`
          );
        }
      }
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!canResend || isResending) return;
    setIsResending(true);
    try {
      const payload = identifier.includes('@')
        ? { email: identifier }
        : { mobileNumber: identifier };
      await sendOtpCode(payload);

      // Reset state for new attempt cycle
      setAttemptsLeft(MAX_ATTEMPTS);
      setIsLocked(false);
      setLockMessage('');
      clearCode();
      startCountdown();

      Alert.alert('Code Sent', `A new verification code has been sent to ${identifier}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const attemptDots = Array.from({ length: MAX_ATTEMPTS }, (_, i) => i);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={[styles.shieldBg, isLocked && styles.shieldBgLocked]}>
                <Ionicons
                  name={isLocked ? 'lock-closed' : 'shield-checkmark'}
                  size={60}
                  color="#FFF"
                />
              </View>
            </View>

            <Text style={styles.title}>
              {isLocked ? 'Account Locked' : 'Verify your number'}
            </Text>
            <Text style={styles.subtitle}>
              {isLocked
                ? lockMessage
                : 'Enter the 6-digit code sent to'}
            </Text>

            {!isLocked && (
              <View style={styles.phoneBadge}>
                <Text style={styles.phoneText}>{identifier}</Text>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Attempt dots */}
            <View style={styles.attemptsRow}>
              {attemptDots.map((i) => (
                <View
                  key={i}
                  style={[
                    styles.attemptDot,
                    i < attemptsLeft && !isLocked
                      ? styles.attemptDotActive
                      : styles.attemptDotUsed,
                  ]}
                />
              ))}
              {!isLocked && attemptsLeft < MAX_ATTEMPTS && (
                <Text style={styles.attemptsLabel}>
                  {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left
                </Text>
              )}
            </View>

            {/* OTP inputs */}
            <Animated.View
              style={[
                styles.codeContainer,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputs.current[index] = ref; }}
                  style={[
                    styles.codeInput,
                    digit ? styles.codeInputActive : null,
                    isLocked ? styles.codeInputLocked : null,
                  ]}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={digit}
                  editable={!isLocked && !isLoading}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                />
              ))}
            </Animated.View>

            {/* Resend / countdown */}
            <View style={styles.resendContainer}>
              {canResend || isLocked ? (
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={isResending}
                  style={styles.resendButton}
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color="#7E57C2" />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={16} color="#7E57C2" style={{ marginRight: 6 }} />
                      <Text style={styles.resendActiveText}>Resend OTP</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendText}>
                  Resend code in{' '}
                  <Text style={styles.timerText}>{formatTime(resendCountdown)}</Text>
                </Text>
              )}
            </View>

            {/* Verify button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (isLocked || isLoading) && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerify}
              disabled={isLocked || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.verifyButtonText}>
                    {isLocked ? 'Locked' : 'Verify & Continue'}
                  </Text>
                  {!isLocked && (
                    <Ionicons name="arrow-forward" size={20} color="#FFF" style={styles.buttonIcon} />
                  )}
                </>
              )}
            </TouchableOpacity>

            {/* Footer */}
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
    backgroundColor: '#9575CD',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7E57C2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  shieldBgLocked: {
    backgroundColor: '#EF5350',
    shadowColor: '#EF5350',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 28,
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
  attemptsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  attemptDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  attemptDotActive: {
    backgroundColor: '#7E57C2',
  },
  attemptDotUsed: {
    backgroundColor: '#E0E0E0',
  },
  attemptsLabel: {
    fontSize: 13,
    color: '#E53935',
    fontWeight: '600',
    marginLeft: 4,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 28,
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
  codeInputLocked: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF8F8',
    color: '#BDBDBD',
  },
  resendContainer: {
    marginBottom: 32,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendText: {
    color: '#666',
    fontSize: 14,
  },
  timerText: {
    color: '#7E57C2',
    fontWeight: '700',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#7E57C2',
    backgroundColor: '#F3E5F5',
  },
  resendActiveText: {
    color: '#7E57C2',
    fontWeight: '700',
    fontSize: 14,
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
  verifyButtonDisabled: {
    backgroundColor: '#BDBDBD',
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
