import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import Header from '../../components/Header'
import { hp, wp } from '../../helpers/common'
import { theme } from '../../constants/theme'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { addComment, getPostComments } from '../../services/postService'
import { useAuth } from '../../contexts/AuthContext'
import Avatar from '../../components/Avatar'
import Icon from '../../assets/icons'

const CommentsScreen = () => {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // Load comments
  const loadComments = async () => {
    setLoading(true);
    const result = await getPostComments(id);
    setLoading(false);

    if (result.success) {
      setComments(result.data);
    } else {
      Alert.alert('Error', result.msg);
    }
  };

  // Submit comment
  const handleSubmitComment = async () => {
    if (!comment.trim()) {
      return;
    }

    if (!user?.id) {
      Alert.alert('Note', 'Please login first');
      return;
    }

    setLoading(true);
    const result = await addComment(id, user.id, comment.trim());
    setLoading(false);

    if (result.success) {
      setComment('');
      // Add new comment to the list
      setComments(prev => [...prev, result.data]);
    } else {
      Alert.alert('Error', result.msg);
    }
  };

  // Pull to refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadComments();
    setRefreshing(false);
  };

  useEffect(() => {
    if (id) {
      loadComments();
    }
  }, [id]);

  // Render single comment
  const renderComment = ({ item }) => (
    <View style={styles.commentItem}>
      <Avatar
        uri={item.profiles.image}
        size={hp(5)}
        rounded={theme.radius.xl}
      />
      <View style={styles.commentContent}>
        <Text style={styles.commentAuthor}>{item.profiles.name}</Text>
        <Text style={styles.commentText}>{item.text}</Text>
        <Text style={styles.commentTime}>
          {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );

  // Render empty state
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {loading ? 'Loading...' : 'No comments yet. Be the first to comment!'}
      </Text>
    </View>
  );

  return (
    <ScreenWrapper contentContainerStyle={{paddingTop: 0}}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 20}
      >
        <Header title="Comments" containerStyle={{marginTop: 0, paddingTop: 10}} />
        
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={[
            styles.commentsList,
            {paddingBottom: Platform.OS === 'ios' ? hp(15) : hp(10)}
          ]}
          ListEmptyComponent={renderEmptyComponent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
        
        <View style={styles.inputContainer}>
          <Avatar
            uri={user?.image}
            size={hp(4.5)}
            rounded={theme.radius.xl}
          />
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!comment.trim() || loading) && styles.disabledButton
            ]}
            onPress={handleSubmitComment}
            disabled={!comment.trim() || loading}
          >
            <Icon 
              name="send" 
              size={hp(2.3)} 
              color={!comment.trim() || loading ? theme.colors.textLight : 'white'} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  )
}

export default CommentsScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  commentsList: {
    paddingTop: hp(1),
    paddingBottom: hp(15),
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: hp(2),
    gap: wp(2),
  },
  commentContent: {
    flex: 1,
    backgroundColor: theme.colors.gray,
    padding: hp(1.5),
    borderRadius: theme.radius.md,
  },
  commentAuthor: {
    fontSize: hp(1.8),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: hp(0.5),
  },
  commentText: {
    fontSize: hp(1.8),
    color: theme.colors.text,
    marginBottom: hp(0.5),
  },
  commentTime: {
    fontSize: hp(1.4),
    color: theme.colors.textLight,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: hp(20),
  },
  emptyText: {
    fontSize: hp(1.8),
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: hp(1.5),
    paddingHorizontal: wp(4),
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray,
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: wp(2),
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.gray,
    borderRadius: theme.radius.xl,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    maxHeight: hp(10),
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: theme.colors.gray,
  },
}) 