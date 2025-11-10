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
  FlatList,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { styles } from '../../styles/styles';
import { colors } from '../../constants/Colors';

interface AISettings {
  keywords: string[];
  customText: string;
  enableSentiment: boolean;
  requireApproval: boolean;
  createdAt?: Date;
}

export default function AIScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AISettings>({
    keywords: ['stocks', 'sales', 'market', 'news', 'technology', 'business'],
    customText: '🚀 Check this out:',
    enableSentiment: false,
    requireApproval: true
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (user) {
      loadAISettings();
    }
  }, [user]);

  const loadAISettings = async () => {
    try {
      if (!db || !user) return;

      const docRef = doc(db, 'settings', `ai_${user.uid}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as AISettings;
        setSettings(data);
        setSaveStatus(`👤 Loaded AI settings for: ${user.email}`);
      } else {
        setSaveStatus(`👤 Signed in as: ${user.email}`);
      }
    } catch (error: any) {
      console.error('Error loading AI settings:', error);
      setSaveStatus('❌ Error: ' + error.message);
    }
  };

  const saveAISettings = async () => {
    if (!db || !user) {
      setSaveStatus('❌ Please sign in to save settings');
      return;
    }

    setLoading(true);
    setSaveStatus('Saving AI settings...');
    
    try {
      await setDoc(doc(db, 'settings', `ai_${user.uid}`), {
        ...settings,
        userId: user.uid,
        userEmail: user.email,
        lastUpdated: new Date(),
        createdAt: settings.createdAt || new Date()
      });
      
      setSaveStatus(`✅ AI settings saved for: ${user.email}`);
      
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error: any) {
      console.error('Error saving AI settings:', error);
      setSaveStatus('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !settings.keywords.includes(newKeyword.trim())) {
      setSettings(prev => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    setSettings(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keywordToRemove)
    }));
  };

  const addTurkishKeywords = () => {
    const turkishKeywords = ['hisse', 'borsa', 'satış', 'piyasa', 'haber', 'teknoloji', 'iş'];
    const newKeywords = [...new Set([...settings.keywords, ...turkishKeywords])];
    setSettings(prev => ({
      ...prev,
      keywords: newKeywords
    }));
    setSaveStatus('✅ Added Turkish keywords');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const addEnglishKeywords = () => {
    const englishKeywords = ['stocks', 'sales', 'market', 'news', 'technology', 'business', 'finance'];
    const newKeywords = [...new Set([...settings.keywords, ...englishKeywords])];
    setSettings(prev => ({
      ...prev,
      keywords: newKeywords
    }));
    setSaveStatus('✅ Added English keywords');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const renderKeywordItem = ({ item }: { item: string }) => (
    <View style={styles.keywordItem}>
      <Text style={styles.keywordText}>{item}</Text>
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => removeKeyword(item)}
      >
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.header}>AI Settings</Text>
          <View style={[styles.statusBadge, styles.statusActive]}>
            <Text style={[styles.statusText, { color: colors.success }]}>Active</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Configure AI analysis for content filtering and enhancement
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

        {/* Keywords Section */}
        <Text style={styles.label}>Keywords for Analysis</Text>
        
        {/* Quick Add Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.smallButton, { backgroundColor: colors.primary, flex: 1, marginRight: 8 }]}
            onPress={addEnglishKeywords}
            disabled={!user}
          >
            <Text style={styles.smallButtonText}>🇺🇸 Add English</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.smallButton, { backgroundColor: colors.warning, flex: 1 }]}
            onPress={addTurkishKeywords}
            disabled={!user}
          >
            <Text style={styles.smallButtonText}>🇹🇷 Add Turkish</Text>
          </TouchableOpacity>
        </View>

        {/* Add Keyword Input */}
        <View style={styles.addSourceContainer}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="Enter new keyword"
            value={newKeyword}
            onChangeText={setNewKeyword}
            onSubmitEditing={addKeyword}
            editable={!!user}
          />
          <TouchableOpacity 
            style={[styles.button, { paddingHorizontal: 16 }]}
            onPress={addKeyword}
            disabled={!user}
          >
            <Text style={styles.buttonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Keywords List */}
        <FlatList
          data={settings.keywords}
          renderItem={renderKeywordItem}
          keyExtractor={(item, index) => index.toString()}
          scrollEnabled={false}
          style={styles.keywordsList}
          numColumns={2}
          columnWrapperStyle={styles.keywordsRow}
        />

        {/* Custom Text */}
        <Text style={styles.label}>Custom Text</Text>
        <TextInput
          style={styles.input}
          placeholder="Text to add before shared content"
          value={settings.customText}
          onChangeText={(text) => setSettings(prev => ({ ...prev, customText: text }))}
          editable={!!user}
        />

        {/* Toggles */}
        <View style={styles.toggleContainer}>
          <Switch
            value={settings.enableSentiment}
            onValueChange={(value) => setSettings(prev => ({ ...prev, enableSentiment: value }))}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={settings.enableSentiment ? '#fff' : '#f4f3f4'}
          />
          <View style={styles.toggleTextContainer}>
            <Text style={styles.toggleText}>Enable Sentiment Analysis</Text>
            <Text style={styles.toggleSubtext}>Analyze emotional tone of content before sharing</Text>
          </View>
        </View>

        <View style={styles.toggleContainer}>
          <Switch
            value={settings.requireApproval}
            onValueChange={(value) => setSettings(prev => ({ ...prev, requireApproval: value }))}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={settings.requireApproval ? '#fff' : '#f4f3f4'}
          />
          <View style={styles.toggleTextContainer}>
            <Text style={styles.toggleText}>Require Approval Before Sharing</Text>
            <Text style={styles.toggleSubtext}>Manual approval required before content is posted</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity 
          style={styles.button}
          onPress={saveAISettings}
          disabled={loading || !user}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>💾 Save AI Settings</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.textSecondary }]}
          onPress={loadAISettings}
          disabled={!user}
        >
          <Text style={styles.buttonText}>🔄 Load Settings</Text>
        </TouchableOpacity>

        {!user && (
          <View style={[styles.statusMessage, styles.statusInfo]}>
            <Text style={styles.statusMessageText}>
              🔐 Please sign in to access and save AI settings.
            </Text>
          </View>
        )}

        {/* AI Settings Status */}
        {user && (
          <View style={styles.connectionStatus}>
            <Text style={styles.connectionTitle}>AI Settings Status:</Text>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>User:</Text>
              <Text style={styles.statusValue}>{user.email}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Keywords:</Text>
              <Text style={styles.statusValue}>{settings.keywords.length} configured</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Sentiment Analysis:</Text>
              <Text style={styles.statusValue}>
                {settings.enableSentiment ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Auto-approval:</Text>
              <Text style={styles.statusValue}>
                {settings.requireApproval ? 'Disabled' : 'Enabled'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Analysis Method:</Text>
              <Text style={styles.statusValue}>Free Keyword Matching</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}