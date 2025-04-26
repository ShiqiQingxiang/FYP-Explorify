import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ScreenWrapper from '../../components/ScreenWrapper';
import Header from '../../components/Header';
import { hp, wp } from '../../helpers/common';
import { theme } from '../../constants/theme';
import Icon from '../../assets/icons';

const VerificationsScreen = () => {
  const { user } = useAuth();
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0
  });

  // Get pending verification tasks
  const fetchVerifications = async () => {
    try {
      setLoading(true);
      
      // Check if user is admin
      console.log('Checking admin privileges for user:', user.id);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
        
      console.log('User data result:', userData, 'Error:', userError);
        
      if (userError || !userData || userData.role !== 'admin') {
        console.error('User is not admin:', userData?.role || 'No role found');
        Alert.alert('Error', 'You do not have admin privileges');
        return;
      }
        
      console.log('Confirmed user is admin, fetching pending tasks...');
        
      // 尝试使用更直接的查询方式，不依赖外键关系
      console.log('Using simplified query to get pending verifications');
      try {
        const { data: verifications, error } = await supabase
          .from('manual_verifications')
          .select('*')
          .eq('status', 'pending');
          
        console.log('Verification query results:', {
          count: verifications?.length || 0,
          error: error?.message || null,
          firstItem: verifications?.[0] || null
        });
        
        if (error) {
          console.error('Failed to fetch verification tasks:', error);
          Alert.alert('Error', 'Failed to get pending tasks');
          return;
        }

        // Process user and spot data
        const enhancedVerifications = [];
        
        for (const verification of verifications || []) {
          // Get user information
          const { data: userData } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', verification.user_id)
            .single();
            
          // Get tourist spot information
          const { data: spotData } = await supabase
            .from('tourist_spots')
            .select('name, task_points, task_requirements')
            .eq('id', verification.spot_id)
            .single();
            
          enhancedVerifications.push({
            ...verification,
            user: userData || { name: 'Unknown User', email: '' },
            spot: spotData || { name: 'Unknown Spot', task_points: 10 }
          });
        }
        
        setPendingVerifications(enhancedVerifications);
        
        // Get statistics data
        const pendingCount = enhancedVerifications.length;
        
        setStats({
          pending: pendingCount || 0
        });
      } catch (innerErr) {
        console.error('Error in inner verification fetch:', innerErr);
      }
    } catch (err) {
      console.error('Error fetching verification tasks:', err);
      Alert.alert('Error', 'Failed to get data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchVerifications();
  }, [user]);

  // Handle review decision
  const handleReview = async (id, approved, comment = '') => {
    try {
      setLoading(true);
      
      // Prepare status and points
      const status = approved ? 'approved' : 'rejected';
      const verification = pendingVerifications.find(v => v.id === id);
      if (!verification) throw new Error('Verification task not found');
      
      const points = approved ? (verification.spot?.task_points || 10) : 0;
      
      // Update review record
      const { error: updateError } = await supabase
        .from('manual_verifications')
        .update({
          status,
          admin_comment: comment,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (updateError) {
        console.error('Failed to update review record:', updateError);
        throw new Error('Failed to update review record');
      }
      
      // Update user task status
      const { error: taskError } = await supabase
        .from('user_tasks')
        .update({
          verification_status: approved ? 'manual_approved' : 'manual_rejected',
          verified: approved,
          completed: approved,
          points_earned: points
        })
        .eq('id', verification.user_task_id);
        
      if (taskError) {
        console.error('Failed to update user task:', taskError);
        throw new Error('Failed to update user task');
      }
      
      // Create notification
      await supabase
        .from('notifications')
        .insert({
          title: approved ? 'Task Approved' : 'Task Rejected',
          senderId: user.id,
          receiverId: verification.user_id,
          data: JSON.stringify({
            type: 'verification_result',
            spotName: verification.spot?.name,
            result: approved ? 'approved' : 'rejected',
            points: points,
            comment: comment
          })
        });
      
      // Refresh list
      fetchVerifications();
      
      Alert.alert('Success', `Task has been ${approved ? 'approved' : 'rejected'}`);
    } catch (err) {
      console.error('Review operation failed:', err);
      Alert.alert('Error', 'Operation failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render statistics
  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.pending}</Text>
        <Text style={styles.statLabel}>Pending</Text>
      </View>
    </View>
  );

  // Render verification item
  const renderVerificationItem = ({ item }) => (
    <View style={styles.verificationItem}>
      <View style={styles.verificationHeader}>
        <Text style={styles.userName}>{item.user?.name || item.user?.email || 'User'}</Text>
        <Text style={styles.timeAgo}>
          {new Date(item.submitted_at).toLocaleString()}
        </Text>
      </View>
      
      <View style={styles.spotInfo}>
        <Text style={styles.spotName}>{item.spot?.name || 'Unknown Spot'}</Text>
        <Text style={styles.pointsLabel}>+{item.spot?.task_points || 10} points</Text>
      </View>
      
      <Image 
        source={{ uri: item.image_url }} 
        style={styles.verificationImage}
        resizeMode="cover"
      />
      
      <View style={styles.requirementsContainer}>
        <Text style={styles.requirementsTitle}>Requirements:</Text>
        {item.spot?.task_requirements && 
          (typeof item.spot.task_requirements === 'string' 
            ? JSON.parse(item.spot.task_requirements)
            : item.spot.task_requirements
          ).map((req, index) => (
            <Text key={index} style={styles.requirementItem}>• {req}</Text>
          ))
        }
      </View>
      
      {/* 完全重构的操作按钮区域 */}
      <View style={styles.reviewActionSection}>
        <Text style={styles.reviewActionTitle}>Choose an action:</Text>
        
        <View style={styles.actionButtons}>
          {/* 批准按钮 - 使用新的结构和固定高度 */}
          <View style={[styles.actionButtonWrapper, {height: hp(16)}]}>
            <TouchableOpacity 
              onPress={() => handleReview(item.id, true)}
              activeOpacity={0.7}
              style={[styles.actionButton, {height: hp(10)}]}
            >
              <View style={[styles.actionInner, styles.approveInner]}>
                <Icon name="heart" size={24} color="white" />
                <Text style={styles.buttonMainText}>Approve</Text>
              </View>
            </TouchableOpacity>
            <View style={[styles.buttonSubTextContainer, styles.approveSubTextContainer, {height: hp(6)}]}>
              <Text style={styles.buttonSubText}>+{item.spot?.task_points || 10} points</Text>
            </View>
          </View>
          
          {/* 拒绝按钮 - 使用新的结构和固定高度 */}
          <View style={[styles.actionButtonWrapper, {height: hp(16)}]}>
            <TouchableOpacity 
              onPress={() => handleReview(item.id, false)}
              activeOpacity={0.7}
              style={[styles.actionButton, {height: hp(10)}]}
            >
              <View style={[styles.actionInner, styles.rejectInner]}>
                <Icon name="delete" size={24} color="white" />
                <Text style={styles.buttonMainText}>Reject</Text>
              </View>
            </TouchableOpacity>
            <View style={[styles.buttonSubTextContainer, styles.rejectSubTextContainer, {height: hp(6)}]}>
              <Text style={styles.buttonSubText}>not meet requirements</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenWrapper>
      <Header title="Review Center" />
      
      {/* Statistics */}
      {!loading && renderStats()}
      
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : pendingVerifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Icon name="heart" size={hp(6)} color={theme.colors.success} />
          <Text style={styles.emptyText}>No pending tasks to review</Text>
        </View>
      ) : (
        <FlatList
          data={pendingVerifications}
          renderItem={renderVerificationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={<View style={{ height: hp(10) }} />}
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(4),
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: hp(1.8),
    color: theme.colors.textLight,
  },
  emptyText: {
    marginTop: hp(2),
    fontSize: hp(2),
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: wp(4),
    backgroundColor: 'white',
    borderRadius: theme.radius.lg,
    marginHorizontal: wp(4),
    marginVertical: hp(2),
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: hp(2.5),
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: hp(1.4),
    color: theme.colors.textLight,
    marginTop: 4,
  },
  listContainer: {
    padding: wp(4),
    paddingBottom: hp(6),
  },
  verificationItem: {
    backgroundColor: 'white',
    borderRadius: theme.radius.lg,
    marginBottom: hp(2),
    padding: wp(4),
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  verificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  userName: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  timeAgo: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
  },
  spotInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  spotName: {
    fontSize: hp(1.7),
    color: theme.colors.text,
  },
  pointsLabel: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.primary,
  },
  verificationImage: {
    width: '100%',
    height: hp(20),
    borderRadius: theme.radius.md,
    marginBottom: hp(2),
  },
  requirementsContainer: {
    backgroundColor: theme.colors.background,
    padding: wp(3),
    borderRadius: theme.radius.md,
    marginBottom: hp(2),
  },
  requirementsTitle: {
    fontSize: hp(1.6),
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: hp(0.5),
  },
  requirementItem: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
    marginLeft: wp(2),
    marginTop: hp(0.3),
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(3),
    marginTop: hp(2),
  },
  actionButtonWrapper: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  actionButton: {
    width: '100%',
  },
  actionInner: {
    padding: hp(2),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: hp(6),
  },
  approveInner: {
    backgroundColor: '#27AE60',
  },
  rejectInner: {
    backgroundColor: '#E74C3C',
  },
  buttonMainText: {
    fontSize: hp(2),
    fontWeight: '700',
    color: 'white',
    marginTop: hp(1),
  },
  buttonSubTextContainer: {
    width: '100%',
    padding: hp(1.5),
    alignItems: 'center',
    justifyContent: 'center',
    height: hp(6),
    minHeight: hp(6),
  },
  approveSubTextContainer: {
    backgroundColor: '#27AE60',
    opacity: 0.9,
  },
  rejectSubTextContainer: {
    backgroundColor: '#E74C3C',
    opacity: 0.9,
  },
  buttonSubText: {
    fontSize: hp(1.5),
    color: 'white',
    textAlign: 'center',
  },
  reviewActionSection: {
    marginTop: hp(2),
    marginBottom: hp(1),
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
    paddingTop: hp(2),
  },
  reviewActionTitle: {
    fontSize: hp(1.7),
    fontWeight: '600',
    color: theme.colors.textDark,
    marginBottom: hp(1.5),
    textAlign: 'center',
  },
  bigActionButton: {
    flex: 1,
    margin: wp(1),
    borderRadius: theme.radius.lg,
    overflow: 'visible',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: hp(1),
  },
  bigButtonText: {
    fontSize: hp(2),
    fontWeight: '700',
    color: 'white',
    marginTop: hp(1),
  },
  buttonSubtext: {
    fontSize: hp(1.4),
    color: 'rgba(255,255,255,0.9)',
    marginTop: hp(0.5),
    marginBottom: hp(1.5),
    position: 'relative',
  },
});

export default VerificationsScreen; 