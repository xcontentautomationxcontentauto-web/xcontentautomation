import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { collection, onSnapshot, query, where, orderBy, limit, writeBatch, doc } from 'firebase/firestore';
import { styles } from '../../styles/styles';
import { colors } from '../../constants/Colors';

interface SystemLog {
  id: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'debug';
  message: string;
  source?: string;
  context?: any;
  timestamp: any;
}

export default function LogsScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error' | 'debug'>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('');
  const [logLimit, setLogLimit] = useState(50);

  useEffect(() => {
    if (user) {
      subscribeToSystemLogs();
    }
  }, [user, logLimit]);

  const subscribeToSystemLogs = () => {
    if (!db || !user) return;

    const q = query(
      collection(db, 'systemLogs'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(logLimit)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SystemLog[];
        setLogs(logsData);
      },
      (error) => {
        console.error('Error subscribing to system logs:', error);
        setStatus('❌ Error loading logs: ' + error.message);
      }
    );

    return unsubscribe;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await subscribeToSystemLogs();
    setRefreshing(false);
    setStatus('✅ Logs refreshed');
    setTimeout(() => setStatus(''), 3000);
  };

  const clearLogs = async () => {
    if (!db || !user) {
      setStatus('❌ Please sign in to clear logs');
      return;
    }

    setLoading(true);
    setStatus('🗑️ Clearing logs...');
    
    try {
      const batch = writeBatch(db);
      logs.forEach(log => {
        const logRef = doc(db, 'systemLogs', log.id);
        batch.delete(logRef);
      });
      
      await batch.commit();
      setStatus('✅ Logs cleared successfully');
      setTimeout(() => setStatus(''), 3000);
    } catch (error: any) {
      console.error('Error clearing logs:', error);
      setStatus('❌ Error clearing logs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getLogLevelColor = (level: string) => {
    const colorsMap = {
      info: colors.primary,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      debug: colors.textSecondary
    };
    return colorsMap[level as keyof typeof colorsMap] || colors.primary;
  };

  const getLogLevelIcon = (level: string) => {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🐛'
    };
    return icons[level as keyof typeof icons] || '📝';
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getLogStats = () => {
    const stats = {
      total: logs.length,
      info: logs.filter(log => log.level === 'info').length,
      success: logs.filter(log => log.level === 'success').length,
      warning: logs.filter(log => log.level === 'warning').length,
      error: logs.filter(log => log.level === 'error').length,
      debug: logs.filter(log => log.level === 'debug').length
    };
    return stats;
  };

  const logStats = getLogStats();

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const renderLogItem = ({ item }: { item: SystemLog }) => (
    <View style={[styles.logItem, { borderLeftColor: getLogLevelColor(item.level) }]}>
      <View style={styles.logHeader}>
        <Text style={styles.logTime}>{formatDate(item.timestamp)}</Text>
        <Text style={[styles.logLevel, { color: getLogLevelColor(item.level) }]}>
          {getLogLevelIcon(item.level)} {item.level.toUpperCase()}
          {item.source && ` • ${item.source}`}
        </Text>
      </View>
      <Text style={styles.logMessage}>{item.message}</Text>
      {item.context && Object.keys(item.context).length > 0 && (
        <View style={styles.logContext}>
          <Text style={styles.logContextText}>
            {JSON.stringify(item.context, null, 2)}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
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

      {/* Filter Buttons */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {['all', 'info', 'success', 'warning', 'error', 'debug'].map((logType) => (
          <TouchableOpacity
            key={logType}
            style={[
              styles.filterButton,
              filter === logType && styles.filterButtonActive
            ]}
            onPress={() => setFilter(logType as any)}
          >
            <Text style={[
              styles.filterButtonText,
              filter === logType && styles.filterButtonTextActive
            ]}>
              {logType.charAt(0).toUpperCase() + logType.slice(1)}
              {` (${getLogStats()[logType as keyof typeof logStats] || 0})`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Log Statistics */}
      {user && logs.length > 0 && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{logStats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{logStats.info}</Text>
            <Text style={styles.statLabel}>Info</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.success }]}>{logStats.success}</Text>
            <Text style={styles.statLabel}>Success</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.warning }]}>{logStats.warning}</Text>
            <Text style={styles.statLabel}>Warning</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.error }]}>{logStats.error}</Text>
            <Text style={styles.statLabel}>Error</Text>
          </View>
        </View>
      )}

      {/* Logs List */}
      <FlatList
        data={filteredLogs}
        renderItem={renderLogItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {logs.length === 0 
                ? 'No logs found yet. System activity will appear here.'
                : 'No logs found matching the current filter.'
              }
            </Text>
            {!user && (
              <Text style={styles.emptyStateSubtext}>
                Please sign in to view system logs.
              </Text>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Action Buttons */}
      {user && logs.length > 0 && (
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, { flex: 1, marginRight: 8 }]}
            onPress={onRefresh}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🔄 Refresh</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.error, flex: 1 }]}
            onPress={clearLogs}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>🗑️ Clear All</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {!user && (
        <View style={[styles.statusMessage, styles.statusInfo, { margin: 16 }]}>
          <Text style={styles.statusMessageText}>
            🔐 Please sign in to view system logs and activity.
          </Text>
        </View>
      )}
    </View>
  );
}