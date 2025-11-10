import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { styles } from '../styles/styles';
import { colors } from '../constants/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function LoginScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const signInDemo = async () => {
    try {
      // For demo purposes, we'll use a simulated login
      // In a real app, you'd implement proper auth
      Alert.alert(
        'Demo Mode',
        'Using demo authentication. All data will be stored locally.',
        [
          {
            text: 'Continue',
            onPress: () => {
              console.log('✅ Demo login activated');
              router.replace('/(tabs)');
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('❌ Sign-in error:', error);
      Alert.alert('Sign-in Failed', error.message);
    }
  };

  if (user) {
    router.replace('/(tabs)');
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.loginContainer}>
      <View style={styles.loginCard}>
        {/* Logo with Icon */}
        <View style={styles.logoContainer}>
          <Ionicons name="rocket" size={64} color={colors.primary} />
        </View>
        
        <Text style={styles.loginHeader}>Welcome to X Bot Manager</Text>
        <Text style={styles.loginSubtitle}>
          Manage your Twitter automation on mobile
        </Text>
        
        {/* Demo Login Button */}
        <TouchableOpacity 
          style={styles.googleButton}
          onPress={signInDemo}
        >
          <Ionicons name="play-circle" size={20} color="#FFFFFF" style={styles.googleIcon} />
          <Text style={styles.googleButtonText}>Start Demo Mode</Text>
        </TouchableOpacity>
        
        {/* Info Note */}
        <View style={styles.loginNote}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} style={styles.noteIcon} />
          <View style={styles.noteTextContainer}>
            <Text style={styles.noteText}>
              Demo Mode: Using simulated authentication
            </Text>
            <Text style={styles.noteText}>
              All data is stored locally on your device
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}