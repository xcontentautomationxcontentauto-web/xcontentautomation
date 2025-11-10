import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { styles } from '../../styles/styles';
import { colors } from '../../constants/Colors';

interface Statistics {
  totalScanned: number;
  aiApproved: number;
  posted: number;
  rejected: number;
  lastScan: any;
  lastTweet: any;
  lastNews: any;
  systemUptime: string;
  nextScan: any;
  createdAt?: Date;
}

export default function StatsScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Statistics>({
    totalScanned: 0,
    aiApproved: 0,
    posted: 0,
    rejected: 0,
    lastScan: null,
    lastTweet: null,
    lastNews: null,
    systemUptime: '0 days, 0 hours',
    nextScan: null
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (user) {
      subscribeToStatistics();
    }
  }, [user]);

  const subscribeToStatistics = () => {
    if (!db || !user) return;

    const docRef = doc(db, 'statistics', `current_${user.uid}`);
    
    const unsubscribe = onSnapshot(docRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Statistics;
          setStats(data);
        } else {
          initializeStatistics();
        }
      },
      (error) => {
        console.error('Error subscribing to statistics:', error);
        setStatus('❌ Error loading statistics: ' + error.message);
      }
    );

    return unsubscribe;
  };

  const initializeStatistics = async () => {
    if (!db || !user) return;

    try {
      await updateDoc(doc(db, 'statistics', `current_${user.uid}`), {
        totalScanned: 0,
        aiApproved: 0,
        posted: 0,
        rejected: 0,
        lastScan: null,
        lastTweet: null,
        lastNews: null,
        systemUptime: '0 days, 0 hours',
        nextScan: new Date(Date.now() + 5 * 60 * 1000),
        userId: user.uid,
        userEmail: user.email,
        createdAt: new Date(),
        lastUpdated: new Date()
      });
    } catch (error: any) {
      console.error('Error initializing statistics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await subscribeToStatistics();
    setRefreshing(false);
    setStatus('✅ Statistics refreshed');
    setTimeout(() => setStatus(''), 3000);
  };

  const resetStatistics = async () => {
    if (!db || !user) {
      setStatus('❌ Please sign in to reset statistics');
      return;
    }

    // In React Native, we use Alert from react-native
    // For now, we'll just reset without confirmation
    setLoading(true);
    setStatus('🔄 Resetting statistics...');
    
    try {
      await updateDoc(doc(db, 'statistics', `current_${user.uid}`), {
        totalScanned: 0,
        aiApproved: 0,
        posted: 0,
        rejected: 0,
        lastScan: null,
        lastTweet: null,
        lastNews: null,
        systemUptime: '0 days, 0 hours',
        nextScan: new Date(Date.now() + 5 * 60 * 1000),
        lastUpdated: new Date(),
        resetAt: new Date()
      });
      
      setStatus('✅ Statistics reset successfully');
      setTimeout(() => setStatus(''), 3000);
    } catch (error: any) {
      console.error('Error resetting statistics:', error);
      setStatus('❌ Error resetting statistics: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Never';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatRelativeTime = (timestamp: any) => {
    if (!timestamp) return 'Never';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getPerformanceSummary = () => {
    const { totalScanned, posted, aiApproved, rejected } = stats;
    
    if (totalScanned === 0) {
      return { efficiency: 0, approvalRate: 0, rejectionRate: 0 };
    }

    const efficiency = Math.round((posted / totalScanned) * 100);
    const approvalRate = Math.round((aiApproved / totalScanned) * 100);
    const rejectionRate = Math.round((rejected / totalScanned) * 100);

    return { efficiency, approvalRate, rejectionRate };
  };

  const performance = getPerformanceSummary();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.header}>Statistics & Analytics</Text>
          <View style={[styles.statusBadge, styles.statusActive]}>
            <Text style={[styles.statusText, { color: colors.success }]}>Live</Text>
          </View>
        </View>

        {/* Status Message */}
        {status ? (
          <View style={[
            styles.statusMessage,
            status.includes('✅') ? styles.statusSuccess : 
            status.includes('❌') ? styles.statusError : styles.statusInfo
          ]}>
            <Text style={styles.statusMessageText}>
              {status}
            </Text>
          </View>
        ) : null}

        {!user && (
          <View style={[styles.statusMessage, styles.statusInfo]}>
            <Text style={styles.statusMessageText}>
              🔐 Please sign in to view statistics and analytics.
            </Text>
          </View>
        )}

        {/* Key Metrics */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalScanned.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Scanned</Text>
            <Text style={styles.statSubtext}>Content items processed</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.aiApproved.toLocaleString()}</Text>
            <Text style={styles.statLabel}>AI Approved</Text>
            <Text style={styles.statSubtext}>Automatically approved</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.posted.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Posted</Text>
            <Text style={styles.statSubtext}>Successfully shared</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.rejected.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
            <Text style={styles.statSubtext}>Filtered out</Text>
          </View>
        </View>

        {/* Performance Metrics */}
        {user && stats.totalScanned > 0 && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: performance.efficiency >= 60 ? colors.success : colors.error }]}>
                {performance.efficiency}%
              </Text>
              <Text style={styles.statLabel}>Efficiency</Text>
              <Text style={styles.statSubtext}>Posted/Scanned ratio</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{performance.approvalRate}%</Text>
              <Text style={styles.statLabel}>AI Approval Rate</Text>
              <Text style={styles.statSubtext}>Auto-approved content</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{performance.rejectionRate}%</Text>
              <Text style={styles.statLabel}>Rejection Rate</Text>
              <Text style={styles.statSubtext}>Filtered content</Text>
            </View>
          </View>
        )}

        {/* System Information */}
        <View style={styles.systemInfo}>
          <Text style={styles.systemInfoTitle}>System Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Content Scan:</Text>
            <Text style={styles.infoValue}>
              {formatDate(stats.lastScan)}
              {'\n'}
              <Text style={styles.infoSubtext}>{formatRelativeTime(stats.lastScan)}</Text>
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Tweet Posted:</Text>
            <Text style={styles.infoValue}>
              {formatDate(stats.lastTweet)}
              {'\n'}
              <Text style={styles.infoSubtext}>{formatRelativeTime(stats.lastTweet)}</Text>
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last News Posted:</Text>
            <Text style={styles.infoValue}>
              {formatDate(stats.lastNews)}
              {'\n'}
              <Text style={styles.infoSubtext}>{formatRelativeTime(stats.lastNews)}</Text>
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Next Scheduled Scan:</Text>
            <Text style={styles.infoValue}>
              {stats.nextScan ? formatDate(stats.nextScan) : 'Not scheduled'}
              {'\n'}
              <Text style={styles.infoSubtext}>{stats.nextScan && formatRelativeTime(stats.nextScan)}</Text>
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>System Uptime:</Text>
            <Text style={styles.infoValue}>{stats.systemUptime}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, { flex: 1, marginRight: 8 }]}
            onPress={onRefresh}
            disabled={loading || !user}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>🔄 Refresh</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.warning, flex: 1 }]}
            onPress={resetStatistics}
            disabled={loading || !user}
          >
            <Text style={styles.buttonText}>🔄 Reset Stats</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics Overview */}
        {user && (
          <View style={styles.connectionStatus}>
            <Text style={styles.connectionTitle}>Statistics Overview:</Text>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>User:</Text>
              <Text style={styles.statusValue}>{user.email}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Data Scope:</Text>
              <Text style={styles.statusValue}>User-specific statistics</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Real-time Updates:</Text>
              <Text style={styles.statusValue}>Enabled</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Total Operations:</Text>
              <Text style={styles.statusValue}>{stats.totalScanned + stats.posted + stats.rejected}</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}