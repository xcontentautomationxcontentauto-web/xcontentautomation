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
import { collection, onSnapshot, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { styles } from '../../styles/styles';
import { colors } from '../../constants/Colors';

interface FoundContent {
  id: string;
  title: string;
  content: string;
  source: string;
  type: 'news' | 'tweet';
  status: 'pending' | 'approved' | 'posted' | 'rejected';
  timestamp: any;
  url?: string;
  ai_analysis?: {
    approved: boolean;
    sentiment: string;
    confidence: number;
    relevant_keywords: string[];
  };
}

export default function ContentsScreen() {
  const { user } = useAuth();
  const [contents, setContents] = useState<FoundContent[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'posted' | 'rejected'>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (user) {
      subscribeToContents();
    }
  }, [user]);

  const subscribeToContents = () => {
    if (!db || !user) return;

    const q = query(
      collection(db, 'foundContents'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FoundContent[];
      setContents(contentsData);
    });

    return unsubscribe;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await subscribeToContents();
    setRefreshing(false);
  };

  const approveContent = async (contentId: string) => {
    try {
      const contentRef = doc(db, 'foundContents', contentId);
      await updateDoc(contentRef, {
        status: 'approved',
        approvedAt: new Date()
      });
      setStatus('✅ Content approved');
      setTimeout(() => setStatus(''), 3000);
    } catch (error: any) {
      console.error('Error approving content:', error);
      setStatus('❌ Error approving content');
    }
  };

  const rejectContent = async (contentId: string) => {
    try {
      const contentRef = doc(db, 'foundContents', contentId);
      await updateDoc(contentRef, {
        status: 'rejected',
        rejectedAt: new Date()
      });
      setStatus('❌ Content rejected');
      setTimeout(() => setStatus(''), 3000);
    } catch (error: any) {
      console.error('Error rejecting content:', error);
      setStatus('❌ Error rejecting content');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: colors.warning, label: 'Pending', emoji: '⏳' },
      approved: { color: colors.success, label: 'Approved', emoji: '✅' },
      posted: { color: colors.primary, label: 'Posted', emoji: '🚀' },
      rejected: { color: colors.error, label: 'Rejected', emoji: '❌' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <View style={[styles.statusBadge, { backgroundColor: `${config.color}20` }]}>
        <Text style={[styles.statusText, { color: config.color }]}>
          {config.emoji} {config.label}
        </Text>
      </View>
    );
  };

  const filteredContents = contents.filter(content => {
    if (filter === 'all') return true;
    return content.status === filter;
  });

  const renderContentItem = ({ item }: { item: FoundContent }) => (
    <View style={styles.contentItem}>
      <View style={styles.contentHeader}>
        <View>
          <Text style={styles.contentSource}>
            {item.type === 'tweet' ? '🐦 Tweet' : '📰 News'} • {item.source}
          </Text>
          <Text style={styles.contentDate}>
            {item.timestamp?.toDate?.()?.toLocaleString() || new Date().toLocaleString()}
          </Text>
        </View>
        {getStatusBadge(item.status)}
      </View>

      <Text style={styles.contentTitle}>{item.title}</Text>
      <Text style={styles.contentSummary} numberOfLines={3}>
        {item.content}
      </Text>

      {item.ai_analysis && (
        <View style={styles.aiAnalysis}>
          <Text style={styles.aiAnalysisText}>
            <Text style={styles.bold}>AI Analysis:</Text> 
            <Text style={[styles.sentiment, { color: item.ai_analysis.sentiment === 'positive' ? colors.success : colors.error }]}>
              {item.ai_analysis.sentiment}
            </Text>
            ({Math.round(item.ai_analysis.confidence * 100)}% confidence)
          </Text>
          {item.ai_analysis.relevant_keywords?.length > 0 && (
            <Text style={styles.keywords}>
              <Text style={styles.bold}>Keywords:</Text> {item.ai_analysis.relevant_keywords.join(', ')}
            </Text>
          )}
        </View>
      )}

      <View style={styles.contentActions}>
        {item.status === 'pending' && (
          <>
            <TouchableOpacity 
              style={[styles.smallButton, { backgroundColor: colors.success }]}
              onPress={() => approveContent(item.id)}
            >
              <Text style={styles.smallButtonText}>✅ Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.smallButton, { backgroundColor: colors.error }]}
              onPress={() => rejectContent(item.id)}
            >
              <Text style={styles.smallButtonText}>❌ Reject</Text>
            </TouchableOpacity>
          </>
        )}
        {item.status === 'approved' && (
          <TouchableOpacity 
            style={[styles.smallButton, { backgroundColor: colors.primary }]}
            onPress={() => {/* Implement posting */}}
          >
            <Text style={styles.smallButtonText}>🚀 Post Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Status Message */}
      {status ? (
        <View style={[
          styles.statusMessage,
          status.includes('✅') ? styles.statusSuccess : styles.statusError
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
        {['all', 'pending', 'approved', 'posted', 'rejected'].map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={[
              styles.filterButton,
              filter === filterType && styles.filterButtonActive
            ]}
            onPress={() => setFilter(filterType as any)}
          >
            <Text style={[
              styles.filterButtonText,
              filter === filterType && styles.filterButtonTextActive
            ]}>
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              {` (${contents.filter(c => filterType === 'all' ? true : c.status === filterType).length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Contents List */}
      <FlatList
        data={filteredContents}
        renderItem={renderContentItem}
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
              {contents.length === 0 
                ? 'No contents found yet. System activity will appear here.'
                : 'No contents found matching the current filter.'
              }
            </Text>
            {!user && (
              <Text style={styles.emptyStateSubtext}>
                Please sign in to see your contents.
              </Text>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {!user && (
        <View style={[styles.statusMessage, styles.statusInfo, { margin: 16 }]}>
          <Text style={styles.statusMessageText}>
            🔐 Please sign in to view and manage found contents.
          </Text>
        </View>
      )}
    </View>
  );
}