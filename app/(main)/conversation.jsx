import { StyleSheet, Text, View, TextInput, FlatList, TouchableOpacity, Image, StatusBar, SafeAreaView, KeyboardAvoidingView, Platform, Alert, Keyboard } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { theme } from '../../constants/theme'
import { hp, wp } from '../../helpers/common'
import { FontAwesome } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'
import { getMessages, sendMessage, deleteConversation } from '../../services/chatService'

const Conversation = () => {
  const params = useLocalSearchParams()
  const router = useRouter()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [contactName, setContactName] = useState(params.name || '对话')
  const flatListRef = useRef(null)
  const [userCache, setUserCache] = useState({})
  const [userName, setUserName] = useState(params.name || '')
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // 从路由参数获取对话信息
  const conversation = {
    id: params.id,
    name: contactName,
    avatar: params.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg',
    user_id: params.user_id
  }

  // 使用router获取路由参数
  const route = useLocalSearchParams();
  const conversationId = route.id;
  const userAvatar = route.avatar;
  const userId = route.user_id;
  const userEmail = route.email; // 接收email参数
  
  console.log('路由参数:', {
    id: conversationId,
    user_id: userId,
    email: userEmail,
    avatar: userAvatar
  });

  // 组件挂载时，打印关键信息用于调试
  useEffect(() => {
    console.log('Conversation组件挂载，contactName:', contactName);
    console.log('Conversation组件挂载，userEmail:', userEmail);
  }, []);

  // 当contactName更新时记录
  useEffect(() => {
    console.log('contactName已更新为:', contactName);
  }, [contactName]);

  // 获取用户名称函数，如果无法获取用户名则使用邮箱
  const getUserName = async (userId, email) => {
    try {
      console.log('使用getUserName获取用户名 - userId:', userId, 'email:', email);
      
      // 存储最终使用的名称来源，用于调试
      let nameSource = '';
      
      // 首先尝试从users表获取用户名称（最可靠的来源）
      if (userId) {
        const { data, error } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', userId)
          .single();
          
        if (!error && data) {
          // 优先使用用户真实姓名
          if (data.name) {
            nameSource = 'users表的name字段';
            console.log('从users表获取到用户名:', data.name, '[nameSource]:', nameSource);
            return { name: data.name, source: nameSource };
          }
          // 其次使用用户邮箱
          else if (data.email) {
            nameSource = 'users表的email字段';
            console.log('从users表获取到邮箱:', data.email, '[nameSource]:', nameSource);
            return { name: data.email, source: nameSource };
          }
        } else {
          console.log('从users表获取用户信息失败:', error);
        }
      }
      
      // 如果提供了邮箱作为参数，直接使用
      if (email) {
        nameSource = '函数参数中的email';
        console.log('使用传入的邮箱作为用户名:', email, '[nameSource]:', nameSource);
        return { name: email, source: nameSource };
      }
      
      // 尝试从缓存中获取用户信息
      const cachedDataJson = await AsyncStorage.getItem('searchResultsCache');
      if (cachedDataJson) {
        const cachedUsers = JSON.parse(cachedDataJson);
        const cachedUser = cachedUsers.find(u => u.id === userId);
        if (cachedUser) {
          // 优先使用缓存的名称
          if (cachedUser.name && cachedUser.name !== cachedUser.email) {
            nameSource = '缓存中的name字段';
            console.log('从缓存使用用户名:', cachedUser.name, '[nameSource]:', nameSource);
            return { name: cachedUser.name, source: nameSource };
          }
          // 其次使用缓存的邮箱
          else if (cachedUser.email) {
            nameSource = '缓存中的email字段';
            console.log('从缓存使用邮箱:', cachedUser.email, '[nameSource]:', nameSource);
            return { name: cachedUser.email, source: nameSource };
          }
        }
      }
      
      // 检查上次添加的用户
      const lastAddedId = await AsyncStorage.getItem('lastAddedUserId');
      if (lastAddedId === userId) {
        // 优先使用名称
        const lastAddedName = await AsyncStorage.getItem('lastAddedUserName');
        if (lastAddedName) {
          nameSource = 'AsyncStorage中的lastAddedUserName';
          console.log('使用上次添加的用户名称:', lastAddedName, '[nameSource]:', nameSource);
          return { name: lastAddedName, source: nameSource };
        }
        
        // 其次使用邮箱
        const lastAddedEmail = await AsyncStorage.getItem('lastAddedUserEmail');
        if (lastAddedEmail) {
          nameSource = 'AsyncStorage中的lastAddedUserEmail';
          console.log('使用上次添加的用户邮箱:', lastAddedEmail, '[nameSource]:', nameSource);
          return { name: lastAddedEmail, source: nameSource };
        }
      }
      
      // 尝试通过系统消息获取用户信息
      if (userId && conversationId) {
        try {
          const { data: systemMsgs, error: sysError } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(5);
            
          if (!sysError && systemMsgs && systemMsgs.length > 0) {
            for (const msg of systemMsgs) {
              try {
                const content = JSON.parse(msg.content);
                if (content.type === 'system') {
                  if (content.participant_names && content.participant_names[userId]) {
                    nameSource = '系统消息中的participant_names';
                    console.log('从系统消息获取用户名:', content.participant_names[userId], '[nameSource]:', nameSource);
                    return { name: content.participant_names[userId], source: nameSource };
                  } else if (content.participant_emails && content.participant_emails[userId]) {
                    nameSource = '系统消息中的participant_emails';
                    console.log('从系统消息获取邮箱:', content.participant_emails[userId], '[nameSource]:', nameSource);
                    return { name: content.participant_emails[userId], source: nameSource };
                  }
                }
              } catch (e) {
                // 不是有效的JSON，继续
              }
            }
          }
        } catch (e) {
          console.error('从系统消息获取用户信息错误:', e);
        }
      }
      
      // 所有方法都失败时，返回默认值
      nameSource = '默认值';
      return { name: userId ? `用户 ${userId.substring(0, 8)}` : '未知用户', source: nameSource };
    } catch (error) {
      console.error('获取用户名称错误:', error);
      return { name: email || userId?.substring(0, 8) || '未知用户', source: '错误回退' };
    }
  };

  useEffect(() => {
    // 首先检查路由参数中是否有email
    if (userEmail) {
      console.log('从路由参数获取到联系人邮箱:', userEmail);
      
      // 先尝试获取真实姓名
      const loadUserName = async () => {
        try {
          const { name, source } = await getUserName(userId, userEmail);
          setContactName(name);
          console.log('设置联系人名称:', name, '[来源]:', source);
        } catch (error) {
          console.error('获取联系人姓名失败:', error);
          setContactName(userEmail);
        }
      };
      
      loadUserName();
      
      // 将用户信息缓存到AsyncStorage
      const cacheUserInfo = async () => {
        try {
          await AsyncStorage.setItem('lastAddedUserId', userId);
          await AsyncStorage.setItem('lastAddedUserEmail', userEmail);
          
          // 更新或添加到缓存的搜索结果
          const cachedDataJson = await AsyncStorage.getItem('searchResultsCache');
          let cachedUsers = [];
          if (cachedDataJson) {
            cachedUsers = JSON.parse(cachedDataJson);
            // 移除相同ID的用户(如果存在)
            cachedUsers = cachedUsers.filter(u => u.id !== userId);
          }
          
          // 添加新的用户信息
          cachedUsers.push({
            id: userId,
            name: contactName || userEmail, // 使用已获取的名称
            email: userEmail,
            avatar: userAvatar
          });
          
          // 保存更新后的缓存
          await AsyncStorage.setItem('searchResultsCache', JSON.stringify(cachedUsers));
        } catch (error) {
          console.error('缓存用户信息错误:', error);
        }
      };
      
      cacheUserInfo();
      return;
    }
    
    // 如果路由参数中没有email，则尝试从其他来源获取
    const loadContactInfo = async () => {
      try {
        // 调用getUserName函数获取用户名或邮箱
        const { name, source } = await getUserName(params.user_id, null);
        setContactName(name);
        console.log('设置联系人名称:', name, '[来源]:', source);
      } catch (error) {
        console.error('加载联系人信息错误:', error);
        // 如果还是没找到，使用ID的前段
        if (params.user_id) {
          setContactName(`用户 ${params.user_id.substring(0, 8)}`);
        }
      }
    };
    
    loadContactInfo();
  }, [params.user_id, params.id, userId, userAvatar, userEmail]);

  useEffect(() => {
    // 检查用户登录状态并加载消息
    const loadUserAndMessages = async () => {
      try {
        setLoading(true)
        
        // 获取当前登录用户
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        if (user && conversation.id) {
          // 获取对话消息
          const { success, data, msg } = await getMessages(conversation.id, user.id)
          
          if (success) {
            setMessages(data)
          } else {
            console.error('获取消息失败:', msg)
          }
        }
      } catch (error) {
        console.error('加载用户和消息错误:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserAndMessages()

    // 设置消息的实时订阅
    const messagesSubscription = supabase
      .channel(`conversation:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, payload => {
        // 当有新消息时，检查是否是当前用户发送的
        if (user && payload.new.sender_id !== user.id) {
          // 如果不是当前用户发送的，则加载新消息
          getMessages(conversation.id, user.id).then(({ success, data }) => {
            if (success) setMessages(data)
          })
        }
      })
      .subscribe((status) => {
        console.log('实时订阅状态:', status)
      })
      
    return () => {
      // 清理订阅
      messagesSubscription.unsubscribe()
    }
  }, [conversation.id])

  // 处理用户数据缓存
  useEffect(() => {
    if (userId && userEmail) {
      // 将用户ID、名称和头像缓存起来
      setUserCache(prev => ({
        ...prev,
        [userId]: { 
          name: userName, 
          avatar: userAvatar,
          email: userEmail 
        }
      }));
    }
  }, [userId, userName, userAvatar, userEmail]);

  // 发送消息
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return
    
    try {
      // 发送消息到Supabase
      const { success, data, msg } = await sendMessage(
        conversation.id,
        user.id,
        newMessage.trim()
      )
      
      if (success) {
        // 立即在UI上添加新消息
        const newMsg = {
          id: data.id,
          sender_id: 'me',
          content: newMessage.trim(),
          timestamp: data.created_at || new Date().toISOString(),
        }
        
        setMessages([...messages, newMsg])
        setNewMessage('')
        
        // 滚动到底部
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true })
        }, 100)
      } else {
        console.error('发送消息失败:', msg)
      }
    } catch (error) {
      console.error('发送消息错误:', error)
    }
  }

  // 格式化时间
  const formatTime = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // 渲染消息项
  const renderMessageItem = ({ item }) => {
    const isMe = item.sender_id === 'me'
    
    return (
      <View style={[
        styles.messageContainer,
        isMe ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        {!isMe && (
          <Image source={{ uri: conversation.avatar }} style={styles.messageAvatar} />
        )}
        <View style={[
          styles.messageBubble,
          isMe ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isMe ? styles.myMessageText : styles.otherMessageText
          ]}>{item.content}</Text>
        </View>
        <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
      </View>
    )
  }

  // 消息分组
  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(message => {
      const date = new Date(message.timestamp);
      const dateStr = date.toDateString();
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(message);
    });
    return groups;
  }

  // 渲染日期分隔线
  const renderDateSeparator = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    let displayDate;
    
    if (date.toDateString() === now.toDateString()) {
      displayDate = '今天';
    } else if (now.getDate() - date.getDate() === 1 && 
               date.getMonth() === now.getMonth() && 
               date.getFullYear() === now.getFullYear()) {
      displayDate = '昨天';
    } else {
      displayDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    }
    
    return (
      <View style={styles.dateSeparator}>
        <View style={styles.dateLine} />
        <Text style={styles.dateText}>{displayDate}</Text>
        <View style={styles.dateLine} />
      </View>
    );
  }

  // 删除当前对话
  const handleDeleteConversation = async () => {
    Alert.alert(
      '删除对话',
      `确定要删除与 ${contactName} 的对话吗？所有消息将被删除。`,
      [
        {
          text: '取消',
          style: 'cancel'
        },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { success, msg } = await deleteConversation(conversation.id, user.id);
              
              if (success) {
                Alert.alert('成功', '对话已删除');
                // 返回上一页
                router.back();
              } else {
                console.error('删除对话失败:', msg);
                Alert.alert('错误', '删除对话失败: ' + msg);
              }
            } catch (error) {
              console.error('删除对话错误:', error);
              Alert.alert('错误', '删除对话失败，请重试');
            }
          }
        }
      ]
    );
  };

  // 监听键盘事件
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        // 当键盘显示时，滚动到底部
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // 如果用户未登录，显示提示信息
  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <FontAwesome name="arrow-left" size={hp(2.5)} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>聊天</Text>
            </View>
          </View>
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
      <View style={styles.container}>
        {/* 聊天头部 */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={hp(2.5)} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Image source={{ uri: conversation.avatar }} style={styles.headerAvatar} />
            <Text style={styles.headerName}>{contactName}</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDeleteConversation}
            >
              <FontAwesome name="trash" size={hp(2.2)} color="#FF3B30" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreButton}>
              <FontAwesome name="ellipsis-h" size={hp(2.5)} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        
        <KeyboardAvoidingView 
          style={{flex: 1}}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* 消息列表 */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={item => item.id}
            contentContainerStyle={[
              styles.messagesList,
              keyboardVisible && Platform.OS === 'android' && {paddingBottom: hp(5)}
            ]}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListHeaderComponent={() => (
              messages.length === 0 ? (
                <View style={styles.startConversation}>
                  <Image source={{ uri: conversation.avatar }} style={styles.startAvatar} />
                  <Text style={styles.startTitle}>{contactName}</Text>
                  <Text style={styles.startSubtitle}>开始与{contactName}聊天</Text>
                </View>
              ) : null
            )}
          />
          
          {/* 发送消息栏 */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="输入消息..."
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
              />
            </View>
            <TouchableOpacity 
              style={[
                styles.sendButton,
                !newMessage.trim() && styles.disabledSendButton
              ]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim()}
            >
              <FontAwesome name="paper-plane" size={hp(2.5)} color={!newMessage.trim() ? theme.colors.textLight : 'white'} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  )
}

export default Conversation

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: 'white',
    zIndex: 10,
  },
  backButton: {
    padding: wp(1),
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: wp(2),
  },
  headerAvatar: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    marginRight: wp(2),
  },
  headerName: {
    fontSize: hp(2),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: wp(2),
    marginRight: wp(1),
  },
  moreButton: {
    padding: wp(2),
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: wp(4),
    paddingBottom: hp(1),
    paddingTop: hp(2),
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: hp(1),
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageAvatar: {
    width: hp(3.5),
    height: hp(3.5),
    borderRadius: hp(1.75),
    marginRight: wp(2),
    alignSelf: 'flex-end',
  },
  messageBubble: {
    borderRadius: theme.radius.lg,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    maxWidth: '100%',
  },
  myMessageBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 0,
  },
  otherMessageBubble: {
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: hp(1.7),
    lineHeight: hp(2.2),
  },
  myMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: theme.colors.text,
  },
  messageTime: {
    fontSize: hp(1.2),
    color: theme.colors.textLight,
    alignSelf: 'flex-end',
    marginHorizontal: wp(1),
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: hp(2),
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  dateText: {
    fontSize: hp(1.4),
    color: theme.colors.textLight,
    marginHorizontal: wp(2),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: 'white',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: theme.radius.lg,
    paddingHorizontal: wp(3),
    minHeight: hp(4.5),
  },
  input: {
    flex: 1,
    fontSize: hp(1.7),
    maxHeight: hp(10),
    paddingVertical: Platform.OS === 'ios' ? hp(1) : hp(0.5),
    paddingRight: wp(2),
    color: theme.colors.text,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    width: hp(4.2),
    height: hp(4.2),
    borderRadius: hp(2.1),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: wp(2),
  },
  disabledSendButton: {
    backgroundColor: '#F0F0F0',
  },
  startConversation: {
    alignItems: 'center',
    marginVertical: hp(3),
  },
  startAvatar: {
    width: hp(10),
    height: hp(10),
    borderRadius: hp(5),
    marginBottom: hp(2),
  },
  startTitle: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: hp(1),
  },
  startSubtitle: {
    fontSize: hp(1.6),
    color: theme.colors.textLight,
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
}); 