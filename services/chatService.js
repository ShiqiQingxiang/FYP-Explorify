import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 获取用户的所有对话
export const getConversations = async (userId) => {
  try {
    console.log('获取用户参与的所有对话, 用户ID:', userId);

    // 1. 查询用户参与的所有对话（使用conversation_participants表）
    const { data: participations, error: participationsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (participationsError) {
      console.error('获取用户参与的对话错误:', participationsError);
      // 如果conversation_participants表不存在或出错，回退到使用messages表
      return getConversationsFromMessages(userId);
    }

    // 如果用户没有参与任何对话（通过participants表）
    if (!participations || participations.length === 0) {
      console.log('用户在participants表中没有对话记录，尝试查询messages表');
      return getConversationsFromMessages(userId);
    }

    // 提取用户参与的对话ID（去重）
    const conversationIds = [...new Set(participations.map(p => p.conversation_id))];
    
    if (conversationIds.length === 0) {
      console.log('用户没有参与任何对话');
      return { success: true, data: [] };
    }
    
    // 获取对话的基本信息
    const formattedConversations = [];
    for (const convId of conversationIds) {
      // 获取对话基本信息
      const { data: convInfo, error: convError } = await supabase
        .from('conversations')
        .select('id, created_at, update_at')
        .eq('id', convId)
        .single();
        
      if (convError) {
        console.error(`获取对话 ${convId} 信息错误:`, convError);
        continue;
      }
      
      // 查找对话的其他参与者（不是当前用户的那个）
      const { data: otherParticipants, error: otherParticipantsError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', convId)
        .neq('user_id', userId);
        
      // 如果找不到其他参与者，尝试从消息中查找
      let otherUserId = null;
      if (otherParticipantsError || !otherParticipants || otherParticipants.length === 0) {
        console.log(`对话 ${convId} 在participants表中没有找到其他参与者，尝试从消息中查找`);
        
        // 从消息中查找其他参与者
        const { data: otherMessages, error: otherMessagesError } = await supabase
          .from('messages')
          .select('sender_id')
          .eq('conversation_id', convId)
          .neq('sender_id', userId)
          .limit(5);
          
        if (!otherMessagesError && otherMessages && otherMessages.length > 0) {
          otherUserId = otherMessages[0].sender_id;
          console.log(`从消息中找到对话参与者: ${otherUserId}`);
        }
      } else {
        // 使用第一个其他参与者
        otherUserId = otherParticipants[0].user_id;
        console.log(`从participants表中找到对话参与者: ${otherUserId}`);
      }
      
      // 如果仍然找不到其他参与者
      if (!otherUserId) {
        console.log(`对话 ${convId} 没有找到其他参与者，尝试从系统消息中查找`);
        
        // 尝试从系统消息中找到参与者信息
        const { data: systemMsgs, error: sysError } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true })
          .limit(5);
          
        if (!sysError && systemMsgs && systemMsgs.length > 0) {
          // 遍历前几条消息，寻找系统消息
          for (const msg of systemMsgs) {
            try {
              const content = JSON.parse(msg.content);
              if (content.type === 'system' && content.participants) {
                // 找到系统消息，提取对话参与者
                const participants = content.participants;
                // 对话参与者中找出不是当前用户的那个
                otherUserId = participants.find(id => id !== userId);
                if (otherUserId) {
                  console.log(`从系统消息找到对话参与者: ${otherUserId}`);
                  break;
                }
              }
            } catch (e) {
              // 不是JSON格式，不是系统消息，继续
            }
          }
        }
      }
      
      // 如果仍然没有找到其他参与者
      if (!otherUserId) {
        console.log(`对话 ${convId} 无法确定其他参与者，跳过`);
        continue;
      }
      
      // 从users表获取其他参与者的信息
      let otherUserName = null;
      let otherUserEmail = null;
      
      try {
        // 查询users表获取用户信息
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', otherUserId)
          .single();
          
        if (!userError && userData) {
          if (userData.name) {
            otherUserName = userData.name;
            console.log(`从users表获取到用户名: ${otherUserName}`);
          }
          if (userData.email) {
            otherUserEmail = userData.email;
            console.log(`从users表获取到邮箱: ${otherUserEmail}`);
          }
        } else {
          console.error('获取用户信息错误:', userError);
        }
      } catch (userErr) {
        console.error('从users表获取用户信息异常:', userErr);
      }
      
      // 如果在users表中没有找到信息，尝试从系统消息中获取
      if (!otherUserName || !otherUserEmail) {
        console.log('从users表获取信息失败，尝试从系统消息中获取');
        
        const { data: systemMsgs, error: sysError } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true })
          .limit(5);
          
        if (!sysError && systemMsgs && systemMsgs.length > 0) {
          // 遍历前几条消息，寻找系统消息
          for (const msg of systemMsgs) {
            try {
              // 尝试解析内容为JSON
              const content = JSON.parse(msg.content);
              if (content.type === 'system') {
                // 尝试从系统消息中获取姓名和邮箱
                if (!otherUserName && content.participant_names && content.participant_names[otherUserId]) {
                  otherUserName = content.participant_names[otherUserId];
                  console.log(`从系统消息中获取到用户名: ${otherUserName}`);
                }
                
                if (!otherUserEmail && content.participant_emails && content.participant_emails[otherUserId]) {
                  otherUserEmail = content.participant_emails[otherUserId];
                  console.log(`从系统消息中获取到邮箱: ${otherUserEmail}`);
                }
                
                if (otherUserName && otherUserEmail) break;
              }
            } catch (e) {
              // 不是JSON格式，继续
            }
          }
        }
      }
      
      // 如果仍然没有获取到名称，尝试从缓存中获取或使用备选方案
      if (!otherUserName) {
        // 使用邮箱作为备选
        if (otherUserEmail) {
          otherUserName = otherUserEmail;
          console.log(`使用邮箱作为用户名: ${otherUserEmail}`);
        } else {
          // 尝试从缓存中获取
          try {
            // 检查是否是最近添加的用户
            const lastAddedId = await AsyncStorage.getItem('lastAddedUserId');
            if (lastAddedId === otherUserId) {
              const lastAddedName = await AsyncStorage.getItem('lastAddedUserName');
              if (lastAddedName) {
                otherUserName = lastAddedName;
                console.log(`使用最近添加的用户名称: ${lastAddedName}`);
              } else {
                const lastAddedEmail = await AsyncStorage.getItem('lastAddedUserEmail');
                if (lastAddedEmail) {
                  otherUserName = lastAddedEmail;
                  otherUserEmail = lastAddedEmail;
                  console.log(`使用最近添加的用户邮箱: ${lastAddedEmail}`);
                }
              }
            }
            
            // 如果仍未找到，从搜索缓存获取
            if (!otherUserName) {
              const cachedResults = await getCachedSearchResults();
              const cachedUser = cachedResults.find(u => u.id === otherUserId);
              if (cachedUser) {
                if (cachedUser.name && cachedUser.name !== cachedUser.email) {
                  otherUserName = cachedUser.name;
                  console.log(`从缓存获取到用户名: ${cachedUser.name}`);
                } else if (cachedUser.email) {
                  otherUserName = cachedUser.email;
                  otherUserEmail = cachedUser.email;
                  console.log(`从缓存获取到邮箱: ${cachedUser.email}`);
                }
              }
            }
          } catch (e) {
            console.log('获取缓存信息失败:', e);
          }
        }
      }
      
      // 最后的备选显示名称
      if (!otherUserName) {
        otherUserName = otherUserId ? `用户 ${otherUserId.substring(0, 8)}` : '未知用户';
        console.log(`使用ID截断作为用户名: ${otherUserName}`);
      }
      
      // 获取最后一条消息
      const { data: lastMsgData, error: lastMsgError } = await supabase
        .from('messages')
        .select('id, content, created_at, sender_id, read')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (lastMsgError || !lastMsgData || lastMsgData.length === 0) {
        console.error(`获取对话 ${convId} 最后消息错误:`, lastMsgError);
        continue;
      }
      
      const lastMsg = lastMsgData[0];
      
      // 忽略系统消息的内容显示
      let messageText = lastMsg.content;
      try {
        const content = JSON.parse(lastMsg.content);
        if (content.type === 'system') {
          messageText = '新的对话';
        }
      } catch (e) {
        // 不是JSON，使用原始内容
      }
      
      // 添加到结果列表
      formattedConversations.push({
        id: convId,
        user: {
          id: otherUserId,
          name: otherUserName,
          email: otherUserEmail,
          avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
        },
        lastMessage: {
          text: messageText,
          timestamp: lastMsg.created_at,
          read: lastMsg.read || false,
          isMine: lastMsg.sender_id === userId
        },
        update_at: convInfo.update_at
      });
    }

    // 按最后更新时间排序
    formattedConversations.sort((a, b) => {
      return new Date(b.update_at) - new Date(a.update_at);
    });

    return { success: true, data: formattedConversations };
  } catch (error) {
    console.error('获取对话列表异常:', error);
    return { success: false, msg: error.message };
  }
};

// 从messages表获取对话（兼容旧版本）
const getConversationsFromMessages = async (userId) => {
  try {
    console.log('从messages表获取用户对话');
    
    // 直接从messages表获取用户发送的消息分组
    const { data: userMessages, error: messagesError } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('sender_id', userId);

    if (messagesError) {
      console.error('获取用户消息错误:', messagesError);
      return { success: false, msg: messagesError.message };
    }

    // 提取用户参与的对话ID（去重）
    const conversationIds = [...new Set(userMessages.map(msg => msg.conversation_id))];
    
    if (conversationIds.length === 0) {
      console.log('用户没有参与任何对话');
      return { success: true, data: [] };
    }
    
    // 获取对话的基本信息
    const formattedConversations = [];
    for (const convId of conversationIds) {
      // 获取对话基本信息
      const { data: convInfo, error: convError } = await supabase
        .from('conversations')
        .select('id, created_at, update_at')
        .eq('id', convId)
        .single();
        
      if (convError) {
        console.error(`获取对话 ${convId} 信息错误:`, convError);
        continue;
      }
      
      // 先尝试获取对话的系统消息，查找记录的参与者
      let otherUserId = null;
      let otherUserEmail = null;
      let otherUserName = null;
      const { data: systemMsgs, error: sysError } = await supabase
        .from('messages')
        .select('content')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(5);
        
      if (!sysError && systemMsgs && systemMsgs.length > 0) {
        // 遍历前几条消息，寻找系统消息
        for (const msg of systemMsgs) {
          try {
            // 尝试解析内容为JSON
            const content = JSON.parse(msg.content);
            if (content.type === 'system' && content.participants) {
              // 找到系统消息，提取对话参与者
              const participants = content.participants;
              // 对话参与者中找出不是当前用户的那个
              otherUserId = participants.find(id => id !== userId);
              
              if (otherUserId) {
                console.log(`从系统消息找到对话参与者: ${otherUserId}`);
                
                // 尝试从系统消息中获取姓名
                if (content.participant_names && content.participant_names[otherUserId]) {
                  otherUserName = content.participant_names[otherUserId];
                  console.log(`从系统消息中获取到用户名: ${otherUserName}`);
                }
                
                // 尝试从系统消息中获取邮箱
                if (content.participant_emails && content.participant_emails[otherUserId]) {
                  otherUserEmail = content.participant_emails[otherUserId];
                  console.log(`从系统消息中获取到邮箱: ${otherUserEmail}`);
                }
                
                break;
              }
            }
          } catch (e) {
            // 不是JSON格式，不是系统消息，继续
          }
        }
      }
      
      // 如果系统消息中没找到，再尝试从普通消息找
      if (!otherUserId) {
        // 获取对话中其他人的消息
        const { data: otherMessages, error: otherError } = await supabase
          .from('messages')
          .select('sender_id')
          .eq('conversation_id', convId)
          .neq('sender_id', userId)
          .limit(10);
          
        // 如果有其他人的消息，使用第一个其他发送者
        if (!otherError && otherMessages && otherMessages.length > 0) {
          otherUserId = otherMessages[0].sender_id;
          console.log(`从消息找到对话参与者: ${otherUserId}`);
        } else {
          console.log(`对话 ${convId} 没有找到其他参与者`);
        }
      }
      
      // 获取最后一条消息
      const { data: lastMsgData, error: lastMsgError } = await supabase
        .from('messages')
        .select('id, content, created_at, sender_id, read')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (lastMsgError || !lastMsgData || lastMsgData.length === 0) {
        console.error(`获取对话 ${convId} 最后消息错误:`, lastMsgError);
        continue;
      }
      
      const lastMsg = lastMsgData[0];
      
      // 首先尝试从users表获取用户真实姓名
      let otherUserName2 = null;
      
      if (otherUserId) {
        try {
          // 先从users表获取姓名和邮箱
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', otherUserId)
            .single();
            
          if (!userError && userData) {
            if (userData.name) {
              otherUserName2 = userData.name;
              console.log(`从users表获取到用户名: ${otherUserName2}`);
            }
            if (userData.email) {
              otherUserEmail = userData.email;
              console.log(`从users表获取到邮箱: ${otherUserEmail}`);
            }
          }
        } catch (userErr) {
          console.error('从users表获取用户信息错误:', userErr);
        }
      }
      
      // 整合用户名信息
      if (!otherUserName && otherUserName2) {
        otherUserName = otherUserName2;
      } else if (!otherUserName && otherUserEmail) {
        otherUserName = otherUserEmail;
      } else if (!otherUserName && otherUserId) {
        // 尝试从缓存中获取
        try {
          const lastAddedId = await AsyncStorage.getItem('lastAddedUserId');
          if (lastAddedId === otherUserId) {
            const lastAddedName = await AsyncStorage.getItem('lastAddedUserName');
            if (lastAddedName) {
              otherUserName = lastAddedName;
            } else {
              const lastAddedEmail = await AsyncStorage.getItem('lastAddedUserEmail');
              if (lastAddedEmail) {
                otherUserName = lastAddedEmail;
              }
            }
          }
          
          if (!otherUserName) {
            const cachedResults = await getCachedSearchResults();
            const cachedUser = cachedResults.find(u => u.id === otherUserId);
            if (cachedUser && cachedUser.name) {
              otherUserName = cachedUser.name;
            } else if (cachedUser && cachedUser.email) {
              otherUserName = cachedUser.email;
            }
          }
        } catch (e) {
          console.log('获取缓存信息失败:', e);
        }
      }
      
      // 最后的备选显示名称
      if (!otherUserName) {
        otherUserName = otherUserId ? `用户 ${otherUserId.substring(0, 8)}` : '未知用户';
      }
      
      // 忽略系统消息的内容显示
      let messageText = lastMsg.content;
      try {
        const content = JSON.parse(lastMsg.content);
        if (content.type === 'system') {
          messageText = '新的对话';
        }
      } catch (e) {
        // 不是JSON，使用原始内容
      }
      
      // 添加到结果列表
      formattedConversations.push({
        id: convId,
        user: {
          id: otherUserId || 'unknown',
          name: otherUserName,
          email: otherUserEmail,
          avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
        },
        lastMessage: {
          text: messageText,
          timestamp: lastMsg.created_at,
          read: lastMsg.read || false,
          isMine: lastMsg.sender_id === userId
        },
        update_at: convInfo.update_at
      });
    }
    
    return { success: true, data: formattedConversations };
  } catch (error) {
    console.error('从messages表获取对话列表异常:', error);
    return { success: false, msg: error.message };
  }
};

// 获取缓存的搜索结果
const getCachedSearchResults = async () => {
  try {
    // 从localStorage或AsyncStorage获取
    const cachedData = await AsyncStorage.getItem('searchResultsCache');
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    return [];
  } catch (e) {
    console.error('获取缓存搜索结果错误:', e);
    return [];
  }
};

// 获取特定对话的消息
export const getMessages = async (conversationId, userId) => {
  try {
    // 修改查询，移除users关联
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        sender_id,
        read
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, msg: error.message };
    }

    // 标记消息为已读
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId);

    // 格式化消息数据，过滤掉系统消息或将其转换为用户友好的格式
    const formattedMessages = data
      .filter(msg => {
        // 尝试检测是否为系统消息
        try {
          const content = JSON.parse(msg.content);
          // 如果是系统消息且不想显示，直接过滤掉
          if (content && content.type === 'system') {
            return false; // 不包含系统消息
          }
        } catch (e) {
          // 如果不是JSON，继续处理
        }
        return true;
      })
      .map(msg => {
        // 检查是否为系统消息，转换为友好格式
        try {
          const content = JSON.parse(msg.content);
          if (content && content.type === 'system') {
            // 这段代码不会执行，因为系统消息已被过滤掉
            return {
              id: msg.id,
              sender_id: 'system',
              content: '系统消息',
              timestamp: msg.created_at,
              read: msg.read
            };
          }
        } catch (e) {
          // 不是JSON格式，继续处理
        }
        
        // 处理普通消息
        return {
          id: msg.id,
          sender_id: msg.sender_id === userId ? 'me' : 'other',
          content: msg.content,
          timestamp: msg.created_at,
          read: msg.read
        };
      });

    return { success: true, data: formattedMessages };
  } catch (error) {
    console.error('获取消息异常:', error);
    return { success: false, msg: error.message };
  }
};

// 发送消息
export const sendMessage = async (conversationId, senderId, content) => {
  try {
    // 添加新消息
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: content,
        read: false
      })
      .select();

    if (error) {
      return { success: false, msg: error.message };
    }

    // 更新对话的更新时间
    await supabase
      .from('conversations')
      .update({ update_at: new Date().toISOString() })
      .eq('id', conversationId);

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('发送消息异常:', error);
    return { success: false, msg: error.message };
  }
};

// 搜索用户
export const searchUsers = async (query, currentUserId) => {
  try {
    console.log('搜索查询开始 - 查询:', query, '当前用户ID:', currentUserId);
    
    // 直接从users表多字段搜索
    let userResults = [];
    
    try {
      // 尝试模糊匹配email或name
      const { data: emailUsers, error: emailError } = await supabase
        .from('users')
        .select('*')
        .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
        .neq('id', currentUserId)
        .limit(10);
      
      if (emailError) {
        console.error('复合条件搜索失败:', emailError);
      } else if (emailUsers && emailUsers.length > 0) {
        console.log('复合搜索成功:', emailUsers.length);
        userResults = emailUsers;
      }
    } catch (complexError) {
      console.error('复合搜索异常:', complexError);
    }
    
    // 如果复合搜索没有结果，尝试仅email匹配
    if (userResults.length === 0) {
      try {
        const { data: simpleData, error: simpleError } = await supabase
          .from('users')
          .select('*')
          .ilike('email', `%${query}%`)
          .neq('id', currentUserId)
          .limit(10);
        
        if (!simpleError && simpleData && simpleData.length > 0) {
          console.log('简单搜索成功:', simpleData.length);
          userResults = simpleData;
        } else if (simpleError) {
          console.error('简单搜索失败:', simpleError);
        }
      } catch (simpleError) {
        console.error('简单搜索异常:', simpleError);
      }
    }
    
    // 如果还是没有结果，转储用户表以检查问题
    if (userResults.length === 0) {
      try {
        const { data: allUsers, error: allError } = await supabase
          .from('users')
          .select('id, email, name')
          .limit(20);
        
        if (allError) {
          console.error('获取所有用户失败:', allError);
        } else {
          console.log('数据库中的用户:', allUsers ? allUsers.length : 0);
          console.log('用户示例:', allUsers && allUsers.length > 0 ? allUsers[0] : '无用户');
        }
      } catch (dumpError) {
        console.error('转储用户表错误:', dumpError);
      }
    }
    
    // 格式化结果
    const formattedUsers = userResults.map(user => ({
      id: user.id,
      name: user.name || user.email || '未知用户',
      avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
      bio: '用户',
      email: user.email
    }));
    
    // 缓存搜索结果，以便后续使用
    try {
      await AsyncStorage.setItem('searchResultsCache', JSON.stringify(formattedUsers));
    } catch (cacheError) {
      console.error('缓存搜索结果失败:', cacheError);
    }
    
    return { success: true, data: formattedUsers };
  } catch (error) {
    console.error('搜索用户异常:', error);
    return { success: false, msg: error.message };
  }
};

// 确保对话参与者记录存在
const ensureConversationParticipants = async (conversationId, userId, otherUserId) => {
  try {
    // 先检查这两个用户是否存在于users表中
    const { data: usersExist, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .in('id', [userId, otherUserId]);
      
    if (userCheckError) {
      console.error('检查用户存在性失败:', userCheckError);
      return false;
    }
    
    // 找出存在的用户ID
    const existingUserIds = usersExist.map(user => user.id);
    
    // 检查当前用户是否存在
    if (!existingUserIds.includes(userId)) {
      console.warn(`当前用户 ${userId} 不存在于users表中，跳过创建对话参与者记录`);
      return false;
    }
    
    // 检查目标用户是否存在
    if (!existingUserIds.includes(otherUserId)) {
      console.warn(`目标用户 ${otherUserId} 不存在于users表中，跳过创建对话参与者记录`);
      return false;
    }
    
    // 检查当前用户是否已有记录
    const { data: userPart, error: userCheckPartError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();
      
    // 如果没有记录，创建一个
    if (!userPart && !userCheckPartError) {
      const { error: userCreateError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          created_at: new Date().toISOString()
        });
        
      if (userCreateError) {
        console.error('创建当前用户的参与者记录失败:', userCreateError);
      } else {
        console.log(`为用户 ${userId} 添加了对话 ${conversationId} 的参与者记录`);
      }
    }
    
    // 检查目标用户是否已有记录
    const { data: otherPart, error: otherCheckError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', otherUserId)
      .maybeSingle();
      
    // 如果没有记录，创建一个
    if (!otherPart && !otherCheckError) {
      const { error: otherCreateError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          user_id: otherUserId,
          created_at: new Date().toISOString()
        });
        
      if (otherCreateError) {
        console.error('创建目标用户的参与者记录失败:', otherCreateError);
      } else {
        console.log(`为用户 ${otherUserId} 添加了对话 ${conversationId} 的参与者记录`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('确保对话参与者记录存在异常:', error);
    return false;
  }
};

// 创建或获取一个一对一对话
export const getOrCreateConversation = async (userId, otherUserId, otherUserEmail) => {
  try {
    console.log('尝试创建对话 - 当前用户:', userId, '目标用户:', otherUserId, '邮箱:', otherUserEmail);
    
    // 尝试获取目标用户的姓名
    let otherUserName = null;
    
    // 验证两个用户是否都存在于users表中
    const { data: usersExist, error: userCheckError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', [userId, otherUserId]);
      
    if (userCheckError) {
      console.error('检查用户存在性失败:', userCheckError);
    } else {
      // 如果目标用户不存在
      const otherUserExists = usersExist.some(user => user.id === otherUserId);
      if (!otherUserExists) {
        console.error(`目标用户 ${otherUserId} 不存在于users表中`);
        return { success: false, msg: '目标用户不存在' };
      }
      
      // 如果当前用户不存在
      const currentUserExists = usersExist.some(user => user.id === userId);
      if (!currentUserExists) {
        console.error(`当前用户 ${userId} 不存在于users表中`);
        return { success: false, msg: '当前用户不存在' };
      }
      
      // 获取目标用户信息
      const otherUser = usersExist.find(user => user.id === otherUserId);
      if (otherUser && otherUser.name) {
        otherUserName = otherUser.name;
        console.log(`从users表获取到目标用户名称: ${otherUserName}`);
      }
      if (otherUser && otherUser.email && !otherUserEmail) {
        otherUserEmail = otherUser.email;
        console.log(`从users表获取到目标用户邮箱: ${otherUserEmail}`);
      }
    }
    
    // 如果还没获取到用户名，尝试单独查询
    if (!otherUserName) {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('name')
          .eq('id', otherUserId)
          .single();
          
        if (!userError && userData && userData.name) {
          otherUserName = userData.name;
          console.log(`获取到目标用户名称: ${otherUserName}`);
        }
      } catch (err) {
        console.error('获取目标用户名称失败:', err);
      }
    }
    
    // 直接记录被添加的用户邮箱和名称
    if (otherUserId) {
      // 存储最近添加的用户信息
      await AsyncStorage.setItem('lastAddedUserId', otherUserId);
      if (otherUserEmail) {
        await AsyncStorage.setItem('lastAddedUserEmail', otherUserEmail);
      }
      if (otherUserName) {
        await AsyncStorage.setItem('lastAddedUserName', otherUserName);
      }
      
      // 同时更新搜索缓存
      const cachedResults = await getCachedSearchResults();
      const existingIndex = cachedResults.findIndex(u => u.id === otherUserId);
      
      if (existingIndex >= 0) {
        // 更新现有缓存
        if (otherUserEmail) {
          cachedResults[existingIndex].email = otherUserEmail;
        }
        if (otherUserName) {
          cachedResults[existingIndex].name = otherUserName;
        }
      } else {
        // 添加新的缓存项
        cachedResults.push({
          id: otherUserId,
          name: otherUserName || otherUserEmail || '未知用户',
          email: otherUserEmail,
          avatar: 'https://randomuser.me/api/portraits/lego/1.jpg'
        });
      }
      
      await AsyncStorage.setItem('searchResultsCache', JSON.stringify(cachedResults));
    }
    
    // 先检查conversation_participants表中是否已存在这两个用户的对话
    try {
      // 查找当前用户参与的所有对话
      const { data: userParticipations, error: userPartError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);
        
      if (!userPartError && userParticipations && userParticipations.length > 0) {
        // 查找目标用户参与的所有对话
        const { data: otherParticipations, error: otherPartError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId);
          
        if (!otherPartError && otherParticipations && otherParticipations.length > 0) {
          // 查找两个用户共同参与的对话
          const userConvIds = userParticipations.map(p => p.conversation_id);
          const otherConvIds = otherParticipations.map(p => p.conversation_id);
          
          // 查找交集
          const commonConvIds = userConvIds.filter(id => otherConvIds.includes(id));
          
          if (commonConvIds.length > 0) {
            // 找到共同对话，返回第一个
            console.log(`从conversation_participants表中找到已存在的对话: ${commonConvIds[0]}`);
            return { success: true, data: { id: commonConvIds[0] } };
          }
        }
      }
    } catch (partError) {
      console.error('查询conversation_participants表错误:', partError);
      // 继续使用备选方法查询
    }
    
    // 更全面地检查是否已存在与该用户的对话
    // 方法1: 检查当前用户发送的消息中是否包含与目标用户的对话
    const { data: existingMessages, error: searchError } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('sender_id', userId)
      .limit(100);
      
    if (searchError) {
      console.error('查询现有消息错误:', searchError);
      return { success: false, msg: '查询现有对话失败' };
    }
    
    // 提取对话ID（去重）
    const conversationIds = [...new Set(existingMessages.map(msg => msg.conversation_id))];
    
    // 方法2: 也检查目标用户发送的消息，可能对话已存在但当前用户尚未发送消息
    const { data: otherMessages, error: otherError } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('sender_id', otherUserId)
      .limit(100);
      
    if (!otherError && otherMessages && otherMessages.length > 0) {
      // 合并两个用户的对话ID并去重
      const otherConvIds = [...new Set(otherMessages.map(msg => msg.conversation_id))];
      conversationIds.push(...otherConvIds);
    }
    
    // 如果查到了对话ID，检查是否有相关对话
    if (conversationIds.length > 0) {
      const uniqueConvIds = [...new Set(conversationIds)];
      console.log(`找到 ${uniqueConvIds.length} 个可能的对话`);
      
      // 检查每个对话是否包含这两个用户
      for (const convId of uniqueConvIds) {
        // 方法1: 检查系统消息中的参与者信息
        try {
          const { data: systemMsgs, error: sysError } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true })
            .limit(5);
            
          if (!sysError && systemMsgs && systemMsgs.length > 0) {
            // 遍历前几条消息，寻找系统消息
            for (const msg of systemMsgs) {
              try {
                const content = JSON.parse(msg.content);
                if (content.type === 'system' && content.participants) {
                  // 检查参与者是否包含当前用户和目标用户
                  if (content.participants.includes(userId) && content.participants.includes(otherUserId)) {
                    console.log(`在系统消息中找到已存在的对话: ${convId}`);
                    
                    // 确保conversation_participants表中有记录
                    try {
                      await ensureConversationParticipants(convId, userId, otherUserId);
                    } catch (ensureError) {
                      console.error('确保对话参与者记录失败:', ensureError);
                    }
                    
                    return { success: true, data: { id: convId } };
                  }
                }
              } catch (e) {
                // 不是JSON格式，继续
              }
            }
          }
        } catch (e) {
          console.error('检查系统消息错误:', e);
        }
        
        // 方法2: 检查消息发送者
        const { data: senders, error: sendersError } = await supabase
          .from('messages')
          .select('sender_id')
          .eq('conversation_id', convId)
          .limit(100);
          
        if (!sendersError && senders && senders.length > 0) {
          // 获取所有唯一的发送者
          const uniqueSenders = [...new Set(senders.map(msg => msg.sender_id))];
          // 检查是否包含两个用户
          if (uniqueSenders.includes(userId) && uniqueSenders.includes(otherUserId)) {
            console.log(`在消息发送者中找到已存在的对话: ${convId}`);
            
            // 确保conversation_participants表中有记录
            try {
              await ensureConversationParticipants(convId, userId, otherUserId);
            } catch (ensureError) {
              console.error('确保对话参与者记录失败:', ensureError);
            }
            
            return { success: true, data: { id: convId } };
          }
        }
      }
    }
    
    // 没找到现有对话，创建新的对话
    console.log('未找到现有对话，创建新对话');
    
    // 创建对话记录
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        created_at: new Date().toISOString(),
        update_at: new Date().toISOString()
      })
      .select();
    
    if (createError || !newConv || newConv.length === 0) {
      console.error('创建对话错误:', createError);
      return { success: false, msg: '创建对话失败' };
    }
    
    const conversationId = newConv[0].id;
    console.log(`成功创建对话: ${conversationId}`);
    
    // 创建对话参与者记录
    try {
      // 添加当前用户的记录
      const { error: userPartError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          created_at: new Date().toISOString()
        });
        
      if (userPartError) {
        console.error('创建当前用户的参与者记录失败:', userPartError);
      }
      
      // 添加目标用户的记录
      const { error: otherPartError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          user_id: otherUserId,
          created_at: new Date().toISOString()
        });
        
      if (otherPartError) {
        console.error('创建目标用户的参与者记录失败:', otherPartError);
      }
    } catch (partError) {
      console.error('创建对话参与者记录失败:', partError);
      // 继续执行，即使参与者表插入失败也不影响主要功能
    }
    
    // 添加一条系统消息，包含对话信息
    await createSystemMessage(conversationId, userId, otherUserId, otherUserEmail, otherUserName);
    
    // 添加一条普通消息
    await sendWelcomeMessage(conversationId, userId);
    
    return { success: true, data: { id: conversationId }};
  } catch (error) {
    console.error('创建或获取对话异常:', error);
    return { success: false, msg: error.message };
  }
};

// 发送欢迎消息
const sendWelcomeMessage = async (conversationId, userId) => {
  try {
    // 简单的欢迎消息，不包含调试信息或数据库表内容
    const welcomeMessage = "Welcome to the new conversation!";
    
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: welcomeMessage,
        read: true,
        created_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('发送欢迎消息错误:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('发送欢迎消息异常:', error);
    return false;
  }
};

// 创建系统消息记录对话参与者
const createSystemMessage = async (conversationId, userId, otherUserId, otherUserEmail, otherUserName) => {
  try {
    console.log('创建系统消息，记录参与者信息:', {email: otherUserEmail, name: otherUserName});
    
    // 为系统消息创建内容，带有特殊标记确保前端能识别为系统消息
    const systemMessageContent = JSON.stringify({
      type: 'system',
      participants: [userId, otherUserId],
      participant_emails: {
        [userId]: null,  // 这些信息将在后台使用，不会直接显示给用户
        [otherUserId]: otherUserEmail
      },
      participant_names: {
        [userId]: null,  // 这些信息将在后台使用，不会直接显示给用户
        [otherUserId]: otherUserName
      },
      created_by: userId,
      _hideInChat: true  // 特殊标记，确保前端知道这是系统消息
    });
    
    // 获取当前用户信息
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();
        
      if (!error && data) {
        // 解析JSON以更新
        const contentObj = JSON.parse(systemMessageContent);
        if (data.email) {
          contentObj.participant_emails[userId] = data.email;
        }
        if (data.name) {
          contentObj.participant_names[userId] = data.name;
        }
        // 重新转换为字符串
        systemMessageContent = JSON.stringify(contentObj);
      }
    } catch (e) {
      console.error('获取当前用户信息失败:', e);
    }
    
    // 创建系统消息
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: systemMessageContent,
        read: true,
        created_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('创建系统消息失败:', error);
      return false;
    }
    
    console.log('系统消息创建成功');
    return true;
  } catch (error) {
    console.error('创建系统消息异常:', error);
    return false;
  }
};

// 获取未读消息数
export const getUnreadMessageCount = async (conversationId, userId) => {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('read', false)
      .neq('sender_id', userId);

    if (error) {
      return { success: false, msg: error.message };
    }

    return { success: true, data: count };
  } catch (error) {
    console.error('获取未读消息数异常:', error);
    return { success: false, msg: error.message };
  }
};

// 删除对话及其所有消息
export const deleteConversation = async (conversationId, userId) => {
  try {
    console.log('开始删除对话及其消息:', conversationId);
    
    // 先删除所有与该对话相关的消息
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);
      
    if (messagesError) {
      console.error('删除消息失败:', messagesError);
      return { success: false, msg: '删除消息失败: ' + messagesError.message };
    }
    
    // 然后删除对话记录
    const { error: conversationError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);
      
    if (conversationError) {
      console.error('删除对话失败:', conversationError);
      return { success: false, msg: '删除对话失败: ' + conversationError.message };
    }
    
    // 清理相关缓存
    try {
      // 获取缓存的对话列表
      const cachedDataJson = await AsyncStorage.getItem('searchResultsCache');
      if (cachedDataJson) {
        // 不需要特别处理，因为缓存的是用户信息而非对话
      }
    } catch (cacheError) {
      console.error('清理缓存失败:', cacheError);
      // 继续执行，不影响主要功能
    }
    
    console.log('成功删除对话及其消息');
    return { success: true, msg: '对话已删除' };
  } catch (error) {
    console.error('删除对话异常:', error);
    return { success: false, msg: error.message };
  }
}; 