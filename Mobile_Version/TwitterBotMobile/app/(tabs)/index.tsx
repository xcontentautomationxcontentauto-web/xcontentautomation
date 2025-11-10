import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { TwitterService } from '../../services/twitterService';
import { styles } from '../../styles/styles';
import { colors } from '../../constants/Colors';

interface AccountSettings {
  source: string;
  target: string;
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  createdAt?: Date;
}

export default function AccountScreen() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AccountSettings>({
    source: '',
    target: '',
    consumerKey: '',
    consumerSecret: '',
    accessToken: '',
    accessTokenSecret: ''
  });

  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<{type: string; message: string; details?: any} | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  useEffect(() => {
    if (user) {
      loadAccountSettings();
    }
  }, [user]);

  const loadAccountSettings = async () => {
    try {
      if (!db || !user) return;

      const docRef = doc(db, 'settings', `accounts_${user.uid}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as AccountSettings;
        setAccounts(data);
        setSaveStatus(`👤 Loaded settings for: ${user.email}`);
      } else {
        setSaveStatus(`👤 Signed in as: ${user.email}`);
      }
    } catch (error: any) {
      console.error('❌ Error loading account settings:', error);
      setSaveStatus('❌ Error: ' + error.message);
    }
  };

  const saveAccountSettings = async () => {
    if (!db || !user) {
      setSaveStatus('❌ Please sign in to save settings');
      return;
    }

    if (!accounts.source || !accounts.target) {
      setSaveStatus('❌ Please fill in Source and Target account usernames');
      return;
    }

    setLoading(true);
    setSaveStatus('Saving...');
    
    try {
      await setDoc(doc(db, 'settings', `accounts_${user.uid}`), {
        ...accounts,
        userId: user.uid,
        userEmail: user.email,
        lastUpdated: new Date(),
        createdAt: accounts.createdAt || new Date()
      });
      
      setSaveStatus(`✅ Settings saved for: ${user.email}`);
      
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error: any) {
      console.error('❌ Error saving account settings:', error);
      setSaveStatus('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof AccountSettings, value: string) => {
    setAccounts(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const verifyTwitterCredentials = async () => {
    if (!accounts.consumerKey || !accounts.consumerSecret) {
      Alert.alert('Error', 'Please enter Consumer Key and Consumer Secret first');
      return;
    }

    setTestingConnection(true);
    setVerificationStatus(null);

    try {
      TwitterService.initializeClient({
        consumerKey: accounts.consumerKey,
        consumerSecret: accounts.consumerSecret,
        accessToken: accounts.accessToken,
        accessTokenSecret: accounts.accessTokenSecret
      });

      const connectionTest = await TwitterService.testConnection();
      
      setVerificationStatus({
        type: 'success',
        message: `✅ Connected as @${connectionTest.username}`,
        details: connectionTest
      });

    } catch (error: any) {
      console.error('❌ Twitter verification failed:', error);
      setVerificationStatus({
        type: 'error',
        message: `❌ Twitter verification failed: ${error.message}`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const testFirebaseConnection = async () => {
    try {
      if (!db || !user) {
        setSaveStatus('❌ Firebase not connected');
        return;
      }

      const testDoc = doc(db, 'settings', `test_${user.uid}`);
      await setDoc(testDoc, { test: true, timestamp: new Date(), userId: user.uid });
      const docSnap = await getDoc(testDoc);
      
      if (docSnap.exists()) {
        setSaveStatus(`✅ Firebase connection successful for: ${user.email}`);
      } else {
        setSaveStatus('❌ Firebase test failed: Document not found');
      }
    } catch (error: any) {
      setSaveStatus('❌ Firebase connection failed: ' + error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.header}>X Account Settings</Text>
          <View style={[styles.statusBadge, styles.statusActive]}>
            <Text style={[styles.statusText, { color: colors.success }]}>Active</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Configure your source and target X accounts
        </Text>

        {/* Status Message */}
        {saveStatus ? (
          <View style={[
            styles.statusMessage,
            saveStatus.includes('✅') ? styles.statusSuccess : 
            saveStatus.includes('❌') ? styles.statusError : styles.statusInfo
          ]}>
            <Text style={styles.statusMessageText}>
              {saveStatus}
            </Text>
          </View>
        ) : null}

        {/* Account Inputs */}
        <TextInput
          style={styles.input}
          placeholder="Source Account (Account A) *"
          value={accounts.source}
          onChangeText={(text) => handleInputChange('source', text)}
          editable={!!user}
        />

        <TextInput
          style={styles.input}
          placeholder="Target Account (Account B) *"
          value={accounts.target}
          onChangeText={(text) => handleInputChange('target', text)}
          editable={!!user}
        />

        {/* Credentials Toggle */}
        <View style={styles.toggleContainer}>
          <Switch
            value={showCredentials}
            onValueChange={setShowCredentials}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={showCredentials ? '#fff' : '#f4f3f4'}
          />
          <Text style={styles.toggleText}>Show API Credentials</Text>
        </View>

        {showCredentials && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Consumer Key *"
              value={accounts.consumerKey}
              onChangeText={(text) => handleInputChange('consumerKey', text)}
              secureTextEntry
              editable={!!user}
            />

            <TextInput
              style={styles.input}
              placeholder="Consumer Secret *"
              value={accounts.consumerSecret}
              onChangeText={(text) => handleInputChange('consumerSecret', text)}
              secureTextEntry
              editable={!!user}
            />

            <TextInput
              style={styles.input}
              placeholder="Access Token"
              value={accounts.accessToken}
              onChangeText={(text) => handleInputChange('accessToken', text)}
              secureTextEntry
              editable={!!user}
            />

            <TextInput
              style={styles.input}
              placeholder="Access Token Secret"
              value={accounts.accessTokenSecret}
              onChangeText={(text) => handleInputChange('accessTokenSecret', text)}
              secureTextEntry
              editable={!!user}
            />
          </>
        )}

        {/* Action Buttons */}
        <TouchableOpacity 
          style={styles.button}
          onPress={saveAccountSettings}
          disabled={loading || !user}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>💾 Save Account Settings</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.success }]}
          onPress={verifyTwitterCredentials}
          disabled={testingConnection || !user}
        >
          {testingConnection ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>🔍 Verify Twitter Connection</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.warning }]}
          onPress={testFirebaseConnection}
          disabled={!user}
        >
          <Text style={styles.buttonText}>🔧 Test Firebase Connection</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.textSecondary }]}
          onPress={loadAccountSettings}
          disabled={!user}
        >
          <Text style={styles.buttonText}>🔄 Load Settings</Text>
        </TouchableOpacity>

        {/* Verification Status */}
        {verificationStatus && (
          <View style={[
            styles.statusMessage,
            verificationStatus.type === 'success' ? styles.statusSuccess : styles.statusError
          ]}>
            <Text style={styles.statusMessageText}>
              {verificationStatus.message}
            </Text>
          </View>
        )}

        {!user && (
          <View style={[styles.statusMessage, styles.statusInfo]}>
            <Text style={styles.statusMessageText}>
              🔐 Please sign in to access and save account settings.
            </Text>
          </View>
        )}

        {/* Connection Status */}
        {user && (
          <View style={styles.connectionStatus}>
            <Text style={styles.connectionTitle}>Connection Status:</Text>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>User:</Text>
              <Text style={styles.statusValue}>{user.email}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Firebase:</Text>
              <Text style={[styles.statusValue, { color: colors.success }]}>✅ Connected</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Twitter API:</Text>
              <Text style={[styles.statusValue, 
                accounts.consumerKey && accounts.consumerSecret ? { color: colors.success } : { color: colors.warning }
              ]}>
                {accounts.consumerKey && accounts.consumerSecret ? '🔑 Credentials Set' : '⚠️ Missing Credentials'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}