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

// Independent search component
const SearchScreen = ({ onBack, onSelectUser, currentUserId }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);

  // Focus input field on component mount
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSearch = (text) => {
    setQuery(text);
    
    // Clear previous timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (text.length > 0) {
      setIsSearching(true);
      
      // Set new timer, debounce
      timeoutRef.current = setTimeout(async () => {
        try {
          const { success, data, msg } = await searchUsers(text, currentUserId);
          if (success) {
            setResults(data);
          } else {
            console.error('Failed to search users:', msg);
            setResults([]);
          }
        } catch (error) {
          console.error('Error searching users:', error);
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
        <Text style={styles.addButtonText}>Add</Text>
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
          placeholder="Search user email..."
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
              <Text style={styles.emptyMessage}>No users found</Text>
            ) : (
              <Text style={styles.searchPrompt}>Enter an email to search for users</Text>
            )
          }
        />
      )}
    </View>
  );
};

// Main chat component
const Chat = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  
  useEffect(() => {
    // Check user login status and load conversations
    const loadUserAndConversations = async () => {
      try {
        setLoading(true)
        
        // Get current logged in user
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        if (user) {
          // Get user's conversation list
          const { success, data, msg } = await getConversations(user.id)
          
          if (success) {
            setConversations(data)
          } else {
            console.error('Failed to get conversation list:', msg)
            Alert.alert('Error', 'Failed to get chat list, please try again')
          }
        } else {
          // Use mock data for demo
          setConversations([])
        }
      } catch (error) {
        console.error('Error loading user and conversations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserAndConversations()
    
    // Set up real-time subscriptions for conversations and messages
    const conversationsSubscription = supabase
      .channel('conversations-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, payload => {
        // Reload conversation list when conversations update
        if (user) {
          getConversations(user.id).then(({ success, data }) => {
            if (success) setConversations(data)
          })
        }
      })
      .subscribe((status) => {
        console.log('Conversation subscription status:', status)
      })
      
    const messagesSubscription = supabase
      .channel('new-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, payload => {
        // Refresh conversation list when new messages arrive
        if (user) {
          getConversations(user.id).then(({ success, data }) => {
            if (success) setConversations(data)
          })
        }
      })
      .subscribe((status) => {
        console.log('Message subscription status:', status)
      })
      
    return () => {
      // Cleanup subscriptions
      conversationsSubscription.unsubscribe()
      messagesSubscription.unsubscribe()
    }
  }, [])

  // Add friend (create conversation)
  const addFriend = async (friendId, friendEmail) => {
    if (!user) {
      Alert.alert('Please log in', 'You need to log in to add friends')
      return
    }
    
    if (friendId === user.id) {
      Alert.alert('Note', 'You cannot add yourself as a friend')
      return
    }
    
    try {
      // Check if conversation with this user already exists
      let existingConversations = [...conversations]
      const existingConversation = existingConversations.find(
        conv => conv.user && conv.user.id === friendId
      )
      
      if (existingConversation) {
        // Conversation exists, notify user and offer to open it
        Alert.alert(
          'Already Added',
          'This user is already in your chat list',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'View Chat',
              onPress: () => openChat(existingConversation)
            }
          ]
        )
        return
      }
      
      // Create or get conversation with this user
      const { success, data, msg } = await getOrCreateConversation(user.id, friendId, friendEmail);
      
      if (success) {
        // Refresh conversation list after successful creation
        const conversationsResult = await getConversations(user.id);
        if (conversationsResult.success) {
          setConversations(conversationsResult.data);
        }
        
        // Close search view
        setShowSearch(false);
        
        Alert.alert('Success', 'Added to your chat list')
      } else {
        console.error('Failed to create conversation:', msg)
        Alert.alert('Error', 'Failed to add friend. Reason: ' + msg)
      }
    } catch (error) {
      console.error('Error adding friend:', error)
      Alert.alert('Error', 'Failed to add friend, please try again')
    }
  }

  // Open conversation with a specific user
  const openChat = async (conversation) => {
    try {
      // Check for cached user info
      let email = '';
      // Use correct participant ID field
      let participantId = conversation.user?.id || '';
      
      console.log('Opening conversation - Participant ID:', participantId);
      console.log('Opening conversation - Conversation data:', JSON.stringify(conversation));
      
      // Get user email from cache
      const cachedDataJson = await AsyncStorage.getItem('searchResultsCache');
      if (cachedDataJson) {
        const cachedUsers = JSON.parse(cachedDataJson);
        const cachedUser = cachedUsers.find(u => u.id === participantId);
        if (cachedUser && cachedUser.email) {
          email = cachedUser.email;
          console.log('Got user email from cache:', email);
        }
      }
      
      // If not in cache, try AsyncStorage
      if (!email && participantId) {
        const lastAddedId = await AsyncStorage.getItem('lastAddedUserId');
        if (lastAddedId === participantId) {
          const lastAddedEmail = await AsyncStorage.getItem('lastAddedUserEmail');
          if (lastAddedEmail) {
            email = lastAddedEmail;
            console.log('Got user email from AsyncStorage:', email);
          }
        }
      }
      
      // If still not found, try database
      if (!email && participantId) {
        try {
          // Get email from users table instead of profiles
          const { data, error } = await supabase
            .from('users')
            .select('email')
            .eq('id', participantId)
            .single();
            
          if (!error && data && data.email) {
            email = data.email;
            console.log('Got user email from database:', email);
            
            // Cache the email info to AsyncStorage
            if (email) {
              // Update lastAddedUser info
              await AsyncStorage.setItem('lastAddedUserId', participantId);
              await AsyncStorage.setItem('lastAddedUserEmail', email);
              
              // Update cached search results
              if (cachedDataJson) {
                let cachedUsers = JSON.parse(cachedDataJson);
                const existingUserIndex = cachedUsers.findIndex(u => u.id === participantId);
                
                if (existingUserIndex !== -1) {
                  // Update existing user info
                  cachedUsers[existingUserIndex] = {
                    ...cachedUsers[existingUserIndex],
                    email: email
                  };
                } else {
                  // Add new user
                  cachedUsers.push({
                    id: participantId,
                    email: email,
                    avatar: conversation.user?.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg'
                  });
                }
                
                await AsyncStorage.setItem('searchResultsCache', JSON.stringify(cachedUsers));
              } else {
                // Create new cache
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
          console.error('Error getting user email from database:', dbError);
          // Try profiles table as fallback
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', participantId)
              .single();
                
            if (!error && data && data.email) {
              email = data.email;
              console.log('Got user email from profiles table:', email);
              await AsyncStorage.setItem('lastAddedUserId', participantId);
              await AsyncStorage.setItem('lastAddedUserEmail', email);
            }
          } catch (profileError) {
            console.error('Error getting email from profiles table:', profileError);
          }
        }
      }

      // Navigate to conversation page, passing necessary parameters
      console.log('Navigating to conversation page, params:', {
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
          email: email,
          avatar: conversation.user?.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg',
        }
      });
    } catch (error) {
      console.error('Error opening conversation:', error);
      Alert.alert('Error', 'Cannot open conversation');
    }
  };

  // Format time
  const formatTime = (isoString) => {
    const date = new Date(isoString)
    const now = new Date()
    
    // For today's messages, just show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } 
    // For yesterday's messages, show "Yesterday"
    else if (now.getDate() - date.getDate() === 1 && 
             date.getMonth() === now.getMonth() && 
             date.getFullYear() === now.getFullYear()) {
      return 'Yesterday'
    } 
    // For other dates, show date
    else {
      return `${date.getMonth() + 1}-${date.getDate()}`
    }
  }

  // Delete conversation
  const confirmDeleteConversation = (conversation) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete this conversation with ${conversation.user.name}? All messages will be deleted.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteConversation(conversation)
        }
      ]
    );
  };
  
  // Handle delete conversation
  const handleDeleteConversation = async (conversation) => {
    if (!user) {
      Alert.alert('Please log in', 'You need to log in to delete conversations')
      return
    }
    
    try {
      // Call delete conversation API
      const { success, msg } = await deleteConversation(conversation.id, user.id);
      
      if (success) {
        // Remove deleted conversation from list
        setConversations(prevConversations => 
          prevConversations.filter(conv => conv.id !== conversation.id)
        );
        Alert.alert('Success', 'Conversation deleted');
      } else {
        console.error('Failed to delete conversation:', msg);
        Alert.alert('Error', 'Failed to delete conversation: ' + msg);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      Alert.alert('Error', 'Failed to delete conversation, please try again');
    }
  };

  // Render conversation item
  const renderConversationItem = ({ item }) => {
    if (!item.lastMessage) return null;
    
    // Add delete action
    const onDeletePress = () => {
      confirmDeleteConversation(item);
    };
    
    return (
      <View style={styles.conversationItemContainer}>
        <TouchableOpacity 
          style={styles.conversationItem}
          onPress={() => openChat(item)}
          onLongPress={onDeletePress} // Add long press delete function
          delayLongPress={500} // Set long press time to 500ms
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
                {item.lastMessage.isMine ? `Me: ${item.lastMessage.text}` : item.lastMessage.text}
              </Text>
              {!item.lastMessage.read && !item.lastMessage.isMine && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>New</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Delete button */}
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={onDeletePress}
        >
          <FontAwesome name="trash" size={hp(2.2)} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    )
  }

  // Main chat list interface
  const ConversationsView = () => (
    <View style={styles.container}>
      <Header title="Chat" />
      
      <View style={styles.searchBar}>
        <FontAwesome name="search" size={hp(2.5)} color={theme.colors.textLight} />
        <TouchableOpacity 
          style={styles.searchInput}
          onPress={() => setShowSearch(true)}
        >
          <Text style={styles.searchPlaceholder}>Search user email...</Text>
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
            <Text style={styles.emptyMessage}>No chat history</Text>
            <Text style={styles.emptySubMessage}>Search and add friends to start chatting</Text>
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
          <Header title="Chat" />
          <View style={styles.notLoggedInContainer}>
            <FontAwesome name="user" size={hp(10)} color={theme.colors.gray} />
            <Text style={styles.notLoggedInText}>Please log in first</Text>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => router.push('profile')}
            >
              <Text style={styles.loginButtonText}>Go to Login</Text>
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
    marginTop: hp(1.5),
    marginBottom: hp(1.5),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.8),
    backgroundColor: '#F0F0F0',
    borderRadius: theme.radius.lg,
  },
  searchInput: {
    flex: 1,
    height: hp(4),
    fontSize: hp(1.6),
    color: theme.colors.text,
    paddingVertical: hp(0.3),
  },
  searchPlaceholder: {
    color: theme.colors.textLight,
    fontSize: hp(1.5),
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
    paddingVertical: hp(1.5),
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
    fontSize: hp(1.6),
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