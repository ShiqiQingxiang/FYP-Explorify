import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, Image, StatusBar, SafeAreaView, ActivityIndicator, Alert } from 'react-native'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'expo-router'
import { theme } from '../../constants/theme'
import { hp, wp } from '../../helpers/common'
import { FontAwesome } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Header from '../../components/Header'
import { supabase } from '../../lib/supabase'
import { getConversations, searchUsers, getOrCreateConversation, deleteConversation } from '../../services/chatService'

// 完全独立的搜索组件
const SearchScreen = ({ onBack, onSelectUser, currentUserId }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);

  // 组件挂载时聚焦输入框
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSearch = (text) => {
    setQuery(text);
    
    // 清除之前的计时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (text.length > 0) {
      setIsSearching(true);
      
      // 设置新的计时器，防抖
      timeoutRef.current = setTimeout(async () => {
        try {
          const { success, data, msg } = await searchUsers(text, currentUserId);
          if (success) {
            setResults(data);
          } else {
            console.error('搜索用户失败:', msg);
            setResults([]);
          }
        } catch (error) {
          console.error('搜索用户错误:', error);
        } finally {
          setIsSearching(false);
        }
      }, 500);
    } else {
      setResults([]);
    }
  };

  const renderSearchResultItem = ({ item }) => (
    <View style={styles.searchResultItem}>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>
      </View>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => onSelectUser(item.id, item.email)}
      >
        <Text style={styles.addButtonText}>添加</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={onBack}>
          <FontAwesome name="arrow-left" size={hp(2.5)} color={theme.colors.text} />
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="搜索用户邮箱..."
          value={query}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderSearchResultItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.searchResults}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            query.length > 0 ? (
              <Text style={styles.emptyMessage}>未找到相关用户</Text>
            ) : (
              <Text style={styles.searchPrompt}>请输入用户邮箱进行搜索</Text>
            )
          }
        />
      )}
    </View>
  );
};

// 主聊天组件
const Chat = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  
  useEffect(() => {
    // 检查用户登录状态并加载对话
    const loadUserAndConversations = async () => {
      try {
        setLoading(true)
        
        // 获取当前登录用户
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        if (user) {
          // 获取用户的对话列表
          const { success, data, msg } = await getConversations(user.id)
          
          if (success) {
            setConversations(data)
          } else {
            console.error('获取对话列表失败:', msg)
            Alert.alert('错误', '获取聊天列表失败，请重试')
          }
        } else {
          // 使用模拟数据用于演示
          setConversations([])
        }
      } catch (error) {
        console.error('加载用户和对话错误:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserAndConversations()
    
    // 设置对话和消息的实时订阅
    const conversationsSubscription = supabase
      .channel('conversations-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, payload => {
        // 当对话更新时重新加载对话列表
        if (user) {
          getConversations(user.id).then(({ success, data }) => {
            if (success) setConversations(data)
          })
        }
      })
      .subscribe((status) => {
        console.log('对话订阅状态:', status)
      })
      
    const messagesSubscription = supabase
      .channel('new-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, payload => {
        // 当有新消息时刷新对话列表
        if (user) {
          getConversations(user.id).then(({ success, data }) => {
            if (success) setConversations(data)
          })
        }
      })
      .subscribe((status) => {
        console.log('消息订阅状态:', status)
      })
      
    return () => {
      // 清理订阅
      conversationsSubscription.unsubscribe()
      messagesSubscription.unsubscribe()
    }
  }, [])

  // 添加好友 (创建对话)
  const addFriend = async (friendId, friendEmail) => {
    if (!user) {
      Alert.alert('请先登录', '您需要登录才能添加好友')
      return
    }
    
    if (friendId === user.id) {
      Alert.alert('提示', '不能添加自己为好友')
      return
    }
    
    try {
      // 先检查是否已经有与该用户的对话
      let existingConversations = [...conversations]
      const existingConversation = existingConversations.find(
        conv => conv.user && conv.user.id === friendId
      )
      
      if (existingConversation) {
        // 已存在对话，提示用户并直接打开
        Alert.alert(
          '已添加',
          '该用户已在您的聊天列表中',
          [
            {
              text: '取消',
              style: 'cancel'
            },
            {
              text: '查看聊天',
              onPress: () => openChat(existingConversation)
            }
          ]
        )
        return
      }
      
      // 创建或获取与该用户的对话
      const { success, data, msg } = await getOrCreateConversation(user.id, friendId, friendEmail);
      
      if (success) {
        // 成功创建或获取对话后刷新对话列表
        const conversationsResult = await getConversations(user.id);
        if (conversationsResult.success) {
          setConversations(conversationsResult.data);
        }
        
        // 关闭搜索视图
        setShowSearch(false);
        
        Alert.alert('成功', '已添加到您的聊天列表')
      } else {
        console.error('创建对话失败:', msg)
        Alert.alert('错误', '添加好友失败，请重试。原因：' + msg)
      }
    } catch (error) {
      console.error('添加好友错误:', error)
      Alert.alert('错误', '添加好友失败，请重试')
    }
  }

  // 打开与特定用户的对话
  const openChat = async (conversation) => {
    try {
      // 检查是否有缓存的用户信息
      let email = '';
      // 使用正确的参与者ID字段
      let participantId = conversation.user?.id || '';
      
      console.log('打开对话 - 参与者ID:', participantId);
      console.log('打开对话 - 对话数据:', JSON.stringify(conversation));
      
      // 从缓存中获取用户邮箱
      const cachedDataJson = await AsyncStorage.getItem('searchResultsCache');
      if (cachedDataJson) {
        const cachedUsers = JSON.parse(cachedDataJson);
        const cachedUser = cachedUsers.find(u => u.id === participantId);
        if (cachedUser && cachedUser.email) {
          email = cachedUser.email;
          console.log('从缓存获取到用户邮箱:', email);
        }
      }
      
      // 如果缓存中没有，尝试从AsyncStorage中获取
      if (!email && participantId) {
        const lastAddedId = await AsyncStorage.getItem('lastAddedUserId');
        if (lastAddedId === participantId) {
          const lastAddedEmail = await AsyncStorage.getItem('lastAddedUserEmail');
          if (lastAddedEmail) {
            email = lastAddedEmail;
            console.log('从AsyncStorage获取到用户邮箱:', email);
          }
        }
      }
      
      // 如果还是没有找到邮箱，尝试从数据库中获取
      if (!email && participantId) {
        try {
          // 从users表而不是profiles表获取邮箱
          const { data, error } = await supabase
            .from('users')
            .select('email')
            .eq('id', participantId)
            .single();
            
          if (!error && data && data.email) {
            email = data.email;
            console.log('从数据库获取到用户邮箱:', email);
            
            // 将获取到的邮箱信息缓存到AsyncStorage
            if (email) {
              // 更新lastAddedUser信息
              await AsyncStorage.setItem('lastAddedUserId', participantId);
              await AsyncStorage.setItem('lastAddedUserEmail', email);
              
              // 更新缓存的搜索结果
              if (cachedDataJson) {
                let cachedUsers = JSON.parse(cachedDataJson);
                const existingUserIndex = cachedUsers.findIndex(u => u.id === participantId);
                
                if (existingUserIndex !== -1) {
                  // 更新现有用户信息
                  cachedUsers[existingUserIndex] = {
                    ...cachedUsers[existingUserIndex],
                    email: email
                  };
                } else {
                  // 添加新用户
                  cachedUsers.push({
                    id: participantId,
                    email: email,
                    avatar: conversation.user?.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg'
                  });
                }
                
                await AsyncStorage.setItem('searchResultsCache', JSON.stringify(cachedUsers));
              } else {
                // 创建新的缓存
                const newCache = [{
                  id: participantId,
                  email: email,
                  avatar: conversation.user?.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg'
                }];
                await AsyncStorage.setItem('searchResultsCache', JSON.stringify(newCache));
              }
            }
          }
        } catch (dbError) {
          console.error('从数据库获取用户邮箱错误:', dbError);
          // 尝试从profiles表作为备选
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', participantId)
              .single();
                
            if (!error && data && data.email) {
              email = data.email;
              console.log('从profiles表获取到用户邮箱:', email);
              await AsyncStorage.setItem('lastAddedUserId', participantId);
              await AsyncStorage.setItem('lastAddedUserEmail', email);
            }
          } catch (profileError) {
            console.error('从profiles表获取邮箱错误:', profileError);
          }
        }
      }

      // 导航到对话页面，传递必要参数
      console.log('跳转到对话页面，参数:', {
        id: conversation.id,
        user_id: participantId,
        email: email,
        avatar: conversation.user?.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg',
      });
      
      router.push({
        pathname: "/conversation",
        params: {
          id: conversation.id,
          user_id: participantId,
          email: email, // 确保email参数正确传递
          avatar: conversation.user?.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg',
        }
      });
    } catch (error) {
      console.error('打开对话错误:', error);
      Alert.alert('错误', '无法打开对话');
    }
  };

  // 格式化时间
  const formatTime = (isoString) => {
    const date = new Date(isoString)
    const now = new Date()
    
    // 今天的消息只显示时间
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } 
    // 昨天的消息显示"昨天"
    else if (now.getDate() - date.getDate() === 1 && 
             date.getMonth() === now.getMonth() && 
             date.getFullYear() === now.getFullYear()) {
      return '昨天'
    } 
    // 其他显示日期
    else {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
  }

  // 删除对话
  const confirmDeleteConversation = (conversation) => {
    Alert.alert(
      '删除对话',
      `确定要删除与 ${conversation.user.name} 的对话吗？所有消息将被删除。`,
      [
        {
          text: '取消',
          style: 'cancel'
        },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => handleDeleteConversation(conversation)
        }
      ]
    );
  };
  
  // 处理删除对话
  const handleDeleteConversation = async (conversation) => {
    if (!user) {
      Alert.alert('请先登录', '您需要登录才能删除对话')
      return
    }
    
    try {
      // 调用删除对话的API
      const { success, msg } = await deleteConversation(conversation.id, user.id);
      
      if (success) {
        // 从列表中移除被删除的对话
        setConversations(prevConversations => 
          prevConversations.filter(conv => conv.id !== conversation.id)
        );
        Alert.alert('成功', '对话已删除');
      } else {
        console.error('删除对话失败:', msg);
        Alert.alert('错误', '删除对话失败: ' + msg);
      }
    } catch (error) {
      console.error('删除对话错误:', error);
      Alert.alert('错误', '删除对话失败，请重试');
    }
  };

  // 渲染对话项
  const renderConversationItem = ({ item }) => {
    if (!item.lastMessage) return null;
    
    // 添加删除动作
    const onDeletePress = () => {
      confirmDeleteConversation(item);
    };
    
    return (
      <View style={styles.conversationItemContainer}>
        <TouchableOpacity 
          style={styles.conversationItem}
          onPress={() => openChat(item)}
          onLongPress={onDeletePress} // 添加长按删除功能
          delayLongPress={500} // 设置长按时间为500毫秒
        >
          <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text style={styles.userName}>{item.user.name}</Text>
              <Text style={styles.timeStamp}>{formatTime(item.lastMessage.timestamp)}</Text>
            </View>
            <View style={styles.messageContainer}>
              <Text style={[
                styles.lastMessage, 
                !item.lastMessage.read && !item.lastMessage.isMine && styles.unreadMessage
              ]} numberOfLines={1}>
                {item.lastMessage.isMine ? `我: ${item.lastMessage.text}` : item.lastMessage.text}
              </Text>
              {!item.lastMessage.read && !item.lastMessage.isMine && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>新</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
        
        {/* 删除按钮 */}
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={onDeletePress}
        >
          <FontAwesome name="trash" size={hp(2.2)} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    )
  }

  // 主聊天列表界面
  const ConversationsView = () => (
    <View style={styles.container}>
      <Header title="聊天" />
      
      <View style={styles.searchBar}>
        <FontAwesome name="search" size={hp(2.5)} color={theme.colors.textLight} />
        <TouchableOpacity 
          style={styles.searchInput}
          onPress={() => setShowSearch(true)}
        >
          <Text style={styles.searchPlaceholder}>搜索用户邮箱...</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.conversationsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="envelope-o" size={hp(10)} color={theme.colors.gray} />
            <Text style={styles.emptyMessage}>暂无聊天记录</Text>
            <Text style={styles.emptySubMessage}>搜索并添加好友开始聊天</Text>
          </View>
        }
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          <Header title="聊天" />
          <View style={styles.notLoggedInContainer}>
            <FontAwesome name="user" size={hp(10)} color={theme.colors.gray} />
            <Text style={styles.notLoggedInText}>请先登录</Text>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => router.push('profile')}
            >
              <Text style={styles.loginButtonText}>前往登录</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      {showSearch ? (
        <SearchScreen 
          onBack={() => setShowSearch(false)} 
          onSelectUser={addFriend} 
          currentUserId={user.id}
        />
      ) : (
        <ConversationsView />
      )}
    </SafeAreaView>
  );
}

export default Chat

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp(4),
    marginTop: hp(2),
    marginBottom: hp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
    backgroundColor: '#F0F0F0',
    borderRadius: theme.radius.lg,
  },
  searchInput: {
    flex: 1,
    height: hp(5),
    fontSize: hp(1.8),
    color: theme.colors.text,
    paddingVertical: hp(0.5),
  },
  searchPlaceholder: {
    color: theme.colors.textLight,
    fontSize: hp(1.7),
    paddingLeft: wp(2),
  },
  conversationsList: {
    paddingHorizontal: wp(4),
  },
  conversationItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: wp(2),
  },
  avatar: {
    width: hp(6),
    height: hp(6),
    borderRadius: hp(3),
    marginRight: wp(3),
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  userName: {
    fontSize: hp(1.8),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: hp(0.5),
  },
  timeStamp: {
    fontSize: hp(1.4),
    color: theme.colors.textLight,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    flex: 1,
    fontSize: hp(1.6),
    color: theme.colors.textLight,
  },
  unreadMessage: {
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: hp(2),
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.3),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: wp(2),
  },
  unreadCount: {
    color: 'white',
    fontSize: hp(1.2),
    fontWeight: theme.fonts.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(10),
  },
  emptyMessage: {
    marginTop: hp(2),
    fontSize: hp(1.8),
    color: theme.colors.text,
    fontWeight: theme.fonts.medium,
  },
  emptySubMessage: {
    marginTop: hp(1),
    fontSize: hp(1.6),
    color: theme.colors.textLight,
  },
  searchContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: wp(3),
  },
  searchResults: {
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: hp(10),
  },
  searchPrompt: {
    fontSize: hp(1.8),
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: hp(10),
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userInfo: {
    flex: 1,
    marginRight: wp(3),
  },
  userBio: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: theme.radius.sm,
  },
  addButtonText: {
    color: 'white',
    fontSize: hp(1.5),
    fontWeight: theme.fonts.medium,
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(4),
  },
  notLoggedInText: {
    fontSize: hp(2),
    color: theme.colors.text,
    marginTop: hp(2),
    marginBottom: hp(3),
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.5),
    borderRadius: theme.radius.lg,
  },
  loginButtonText: {
    color: 'white',
    fontSize: hp(1.7),
    fontWeight: theme.fonts.bold,
  },
  deleteButton: {
    padding: hp(1),
    backgroundColor: '#FFE5E5',
    borderRadius: hp(2),
    marginLeft: wp(2),
    height: hp(4),
    width: hp(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
});