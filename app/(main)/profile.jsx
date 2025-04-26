import { Alert, Pressable, StyleSheet, Text, TouchableOpacity, View, Image, ScrollView, FlatList } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'expo-router'
import ScreenWrapper from '../../components/ScreenWrapper'
import Header from '../../components/Header'
import { hp, wp } from '../../helpers/common'
import { theme } from '../../constants/theme'
import Icon from '../../assets/icons'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'

const Profile = () => {
  const {user, setAuth} = useAuth();
  const router = useRouter();
  
  const onLogout = async () => {
      // setAuth(null);
      const { error } = await supabase.auth.signOut();
      if(error) {
        Alert.alert('Sign out', "Error signing out!")
      }
    }

  const handleLogout = async () => {
    // show confirm modal
    Alert.alert('confirm', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        onPress: () => console.log('modal cancelled'),
        style: 'cancel',
      },
      {
        text: 'Logout',
        onPress: () => onLogout(),
        style: 'destructive'
      },
    ]);
  }
  return (
    <ScreenWrapper bg="white">
      <UserHeader user={user} router={router} handleLogout={handleLogout} />
    </ScreenWrapper>
  )
}

const UserHeader = ({user, router, handleLogout}) => {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user && user.id) {
        try {
          setLoading(true);
          
          // Get user information and role
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
            
          if (!userError && userData) {
            setIsAdmin(userData.role === 'admin');
          }
          
          // Get user pending tasks
          const { data: pendingData, error: pendingError } = await supabase
            .from('user_tasks')
            .select(`
              id, 
              verification_status,
              image_url,
              created_at,
              task_id,
              tourist_spots:task_id (name, image_url)
            `)
            .eq('user_id', user.id)
            .eq('verification_status', 'manual_pending');
            
          if (!pendingError && pendingData) {
            setPendingTasks(pendingData);
          }
          
          // Get completed tasks
          const { data: completedData, error: completedError } = await supabase
            .from('user_tasks')
            .select(`
              id,
              created_at,
              completed,
              task_id,
              tourist_spots:task_id (id, name, image_url, description, address)
            `)
            .eq('user_id', user.id)
            .in('verification_status', ['manual_approved', 'auto_approved'])
            .eq('verified', true)
            .order('completed', { ascending: false });
            
          if (!completedError && completedData) {
            console.log('已完成任务数量:', completedData.length);
            setCompletedTasks(completedData);
          } else if (completedError) {
            console.error('获取已完成任务失败:', completedError);
          }
        } catch (err) {
          console.error('获取用户数据失败:', err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [user]);

  // 渲染待审核任务
  const renderPendingTasks = () => {
    if (pendingTasks.length === 0) return null;
    
    return (
      <View style={styles.pendingTasksSection}>
        <Text style={styles.sectionTitle}>Pending Tasks</Text>
        {pendingTasks.map(task => (
          <View key={task.id} style={styles.pendingTask}>
            <Image 
              source={{ uri: task.tourist_spots?.image_url || 'https://via.placeholder.com/60' }} 
              style={styles.taskImage} 
            />
            <View style={styles.taskInfo}>
              <Text style={styles.taskName}>{task.tourist_spots?.name || 'Unknown Spot'}</Text>
              <Text style={styles.taskStatus}>
                <Icon name="clock" size={12} color={theme.colors.warning} /> Under Review
              </Text>
              <Text style={styles.taskDate}>
                Submitted on {new Date(task.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };
  
  // 渲染已完成任务
  const renderCompletedTasks = () => {
    if (completedTasks.length === 0) {
      return (
        <View style={styles.completedTasksSection}>
          <Text style={styles.sectionTitle}>Completed Tasks</Text>
          <View style={styles.emptyStateContainer}>
            <Icon name="award" size={40} color={theme.colors.textLight} />
            <Text style={styles.emptyText}>No completed tasks yet</Text>
            <Text style={styles.emptySubText}>Complete tasks to see them here</Text>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.completedTasksSection}>
        <Text style={styles.sectionTitle}>Completed Tasks</Text>
        {completedTasks.map(task => (
          <TouchableOpacity 
            key={task.id} 
            style={styles.completedTask}
            onPress={() => router.push({
              pathname: '/(main)/task',
              params: {
                id: task.tourist_spots?.id,
                title: task.tourist_spots?.name,
                status: 'completed'
              }
            })}
          >
            <Image 
              source={{ uri: task.tourist_spots?.image_url || 'https://via.placeholder.com/60' }} 
              style={styles.completedTaskImage} 
            />
            <View style={styles.completedTaskContent}>
              <View style={styles.taskInfo}>
                <Text style={styles.completedTaskName}>{task.tourist_spots?.name || 'Unknown Spot'}</Text>
                <Text style={styles.taskAddress} numberOfLines={1}>
                  <Icon name="location" size={12} color={theme.colors.textLight} /> {task.tourist_spots?.address || 'Unknown Location'}
                </Text>
                <View style={styles.completedTaskMeta}>
                  <Text style={styles.taskDate}>
                    {task.completed ? new Date(task.completed).toLocaleDateString() : new Date(task.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <View style={styles.taskBadgeContainer}>
                <View style={styles.taskBadge}>
                  <Icon name="check" size={14} color="white" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <ScrollView 
      style={{flex: 1, backgroundColor: 'white'}}
      contentContainerStyle={{paddingBottom: hp(10)}}
      showsVerticalScrollIndicator={false}
    >
      <View style={{flex: 1, paddingHorizontal: wp(4)}}>
        <Header title="Profile" mb={30}/>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" color={theme.colors.rose} />
        </TouchableOpacity>

        <View>
          <View style={{gap:15, alignItems: 'center'}}>
            <View style={styles.avatarContainer}>
              <Avatar 
                uri={user?.image} 
                size={hp(12)} 
                rounded={theme.radius.xxl*1.4} 
              />
              <Pressable style={styles.editIcon} onPress={() => router.push('editProfile')}>
                <Icon name="edit" strokeWidth={2.5} size={20} />
              </Pressable>
            </View>
            
            {/* User information area */}
            <View style={{alignItems: 'center', gap: 4}}>
              <Text style={styles.userName}>{user && user.name}</Text>
              <Text style={styles.infoText}>{user && user.address}</Text>
            </View>
            
            {/* Admin entry button - only show to admin */}
            {isAdmin && (
              <TouchableOpacity 
                style={styles.adminButtonContainer}
                onPress={() => router.push('/(admin)/verifications')}
              >
                <View style={styles.adminButton}>
                  <View style={styles.adminIconContainer}>
                    <Icon name="threeDotsCircle" size={18} color="white" />
                  </View>
                  <Text style={styles.adminButtonText}>Enter Review Center</Text>
                </View>
              </TouchableOpacity>
            )}
            
            {/* User email phone bio */}
            <View style={{gap:10, marginBottom: hp(2)}}>
              <View style={styles.info}>
                <Icon name="mail" size={20} color={theme.colors.textLight} />
                <Text style={styles.infoText}>
                  {user && user.email}
                </Text>
            </View>
            {
              user && user.phoneNumber && (
                  <View style={styles.info}>
                    <Icon name="call" size={20} color={theme.colors.textLight} />
                    <Text style={styles.infoText}>
                      {user && user.phoneNumber}
                    </Text>
                  </View>
              )
            }
    

            {
              user && user.bio && (
                  <Text style={[styles.infoText, {marginLeft: wp(10)}]}>{user.bio}</Text>
              )
            }
            </View>
          </View>
        </View>
        
        {/* Task statistics - remove points */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedTasks.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pendingTasks.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
        
        {/* Pending tasks display */}
        {!loading && renderPendingTasks()}
        
        {/* Completed tasks display */}
        {!loading && renderCompletedTasks()}
      </View>
    </ScrollView>
  )
}

export default Profile

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginHorizontal: wp(4),
    marginBottom: 20,
  },
  headerShape: {
    width: wp(100),
    height: hp(20),
  },
  avatarContainer: {
    height: hp(12),
    width: hp(12),
    alignItems: 'center',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: -12,
    padding: 7,
    borderRadius: 50,
    backgroundColor: 'white',
    shadowColor: theme.colors.textLight,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 7,
  },
  userName: {
    fontSize: hp(3),
    fontWeight: '500',
    color: theme.colors.textDark,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: hp(1.6),
    fontWeight: '500',
    color: theme.colors.textLight,
  },
  logoutButton: {
    position: 'absolute',
    right: 0,
    padding: 5,
    borderRadius: theme.radius.sm,
    backgroundColor: '#fee2e2'
  },
  listStyle: {
    paddingHorizontal: wp(4),
    paddingBottom: 30,
  },
  noPosts: {
    fontSize: hp(2),
    color: theme.colors.text,
    textAlign: 'center',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: theme.radius.lg,
    gap: 8,
    marginVertical: hp(1),
  },
  pointsText: {
    fontSize: hp(2),
    fontWeight: '600',
    color: theme.colors.primary,
  },
  pendingTasksSection: {
    marginTop: hp(2),
    padding: wp(1),
  },
  sectionTitle: {
    fontSize: hp(2),
    fontWeight: '600',
    color: theme.colors.textDark,
    marginBottom: hp(1.5),
  },
  pendingTask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1.5),
    padding: wp(2),
    backgroundColor: 'white',
    borderRadius: theme.radius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskImage: {
    width: hp(6),
    height: hp(6),
    borderRadius: theme.radius.sm,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: hp(1.8),
    fontWeight: '500',
    color: theme.colors.textDark,
  },
  taskStatus: {
    fontSize: hp(1.6),
    fontWeight: '500',
    color: theme.colors.warning,
  },
  taskDate: {
    fontSize: hp(1.4),
    fontWeight: '500',
    color: theme.colors.textLight,
  },
  adminButtonContainer: {
    overflow: 'hidden',
    borderRadius: theme.radius.lg,
    marginTop: hp(2),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.2),
    backgroundColor: '#27ae60',
    borderRadius: theme.radius.lg,
  },
  adminIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 50,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(2),
  },
  adminButtonText: {
    color: 'white',
    fontSize: hp(1.8),
    fontWeight: '600',
  },
  pendingNote: {
    fontSize: hp(1.6),
    fontWeight: '500',
    color: theme.colors.textDark,
    marginBottom: hp(1),
  },
  emptyText: {
    fontSize: hp(2),
    color: theme.colors.text,
    textAlign: 'center',
  },
  logoutButtonText: {
    color: theme.colors.rose,
    fontSize: hp(1.8),
    fontWeight: '600',
  },
  // 新增样式
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: theme.radius.lg,
    padding: wp(4),
    marginVertical: hp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: hp(2.2),
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  statLabel: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: hp(4),
    backgroundColor: theme.colors.gray + '30',
  },
  completedTasksSection: {
    marginTop: hp(2),
    padding: wp(1),
  },
  completedTask: {
    backgroundColor: 'white',
    borderRadius: theme.radius.md,
    marginBottom: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  completedTaskImage: {
    width: '100%',
    height: hp(12),
    resizeMode: 'cover',
  },
  completedTaskContent: {
    flexDirection: 'row',
    padding: wp(3),
  },
  completedTaskName: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  taskAddress: {
    fontSize: hp(1.4),
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  completedTaskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskBadgeContainer: {
    justifyContent: 'center',
  },
  taskBadge: {
    backgroundColor: theme.colors.success,
    width: hp(3),
    height: hp(3),
    borderRadius: hp(1.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp(8),
    backgroundColor: '#f7f8fa',
    borderRadius: theme.radius.lg,
    marginVertical: hp(1),
  },
  emptySubText: {
    fontSize: hp(1.6),
    color: theme.colors.textLight,
    marginTop: hp(0.5),
  },
  maleText: {
    fontSize: hp(4),
    color: '#4285F4', // 蓝色
    fontStyle: 'italic',
    fontWeight: '400',
  },
})