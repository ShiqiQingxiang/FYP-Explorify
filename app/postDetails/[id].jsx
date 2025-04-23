import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import Header from '../../components/Header'
import { hp, wp } from '../../helpers/common'
import { theme } from '../../constants/theme'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'
import Icon from '../../assets/icons'
import { Video } from 'expo-av'
import { getSupabaseFileUrl } from '../../services/imageService'
import { getPostComments } from '../../services/postService'
import { useAuth } from '../../contexts/AuthContext'

// Function to remove HTML tags
const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<\/?[^>]+(>|$)/g, '');
}

const PostDetails = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);

  // Fetch post details
  useEffect(() => {
    const fetchPostDetails = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles:userId (
              id,
              name,
              image
            )
          `)
          .eq('id', id)
          .single();
        
        if (error) {
          console.error('Error fetching post details:', error);
          Alert.alert('Error', 'Unable to load post content');
          router.back();
          return;
        }
        
        setPost(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching post details:', error);
        Alert.alert('Error', 'An error occurred while loading the post');
        router.back();
      }
    };
    
    fetchPostDetails();
  }, [id]);

  // Get post comments
  useEffect(() => {
    const loadComments = async () => {
      if (!id) return;
      
      setCommentsLoading(true);
      const result = await getPostComments(id);
      setCommentsLoading(false);
      
      if (result.success) {
        setComments(result.data);
      } else {
        Alert.alert('Error', result.msg);
      }
    };
    
    loadComments();
  }, [id]);

  // Check if video or image
  const isVideo = post?.file && post.file.includes('postVideos');
  const isImage = post?.file && post.file.includes('postImages');
  
  // Get file URI
  const getFileUri = file => {
    if (!file) return null;
    return getSupabaseFileUrl(file)?.uri;
  }

  // Handle comment button click
  const handleComment = () => {
    router.push({
      pathname: '/comments/[id]',
      params: { id: post.id }
    });
  };

  // Handle view profile
  const handleViewProfile = () => {
    router.push({
      pathname: '/profile/[id]',
      params: { id: post.profiles.id }
    });
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading post content...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // Clean HTML tags
  const cleanBody = stripHtml(post.body);

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Header title="Post Details" />
        
        {/* User info */}
        <TouchableOpacity style={styles.userInfo} onPress={handleViewProfile}>
          <Avatar 
            uri={post.profiles.image}
            size={hp(6)}
            rounded={theme.radius.xl}
          />
          <View>
            <Text style={styles.username}>{post.profiles.name}</Text>
            <Text style={styles.time}>
              {new Date(post.created_at).toLocaleDateString()} {new Date(post.created_at).toLocaleTimeString()}
            </Text>
          </View>
        </TouchableOpacity>
        
        {/* Post content */}
        <View style={styles.contentContainer}>
          {cleanBody && (
            <Text style={styles.bodyText}>{cleanBody}</Text>
          )}
          
          {/* Post media */}
          {isImage && (
            <View style={styles.mediaContainer}>
              <Image 
                source={{ uri: getFileUri(post.file) }}
                style={styles.media}
                resizeMode="contain"
              />
            </View>
          )}
          
          {isVideo && (
            <View style={styles.mediaContainer}>
              <Video
                source={{ uri: getFileUri(post.file) }}
                style={styles.media}
                useNativeControls
                resizeMode="contain"
                isLooping
              />
            </View>
          )}
        </View>
        
        {/* Action buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.commentButton}
            onPress={handleComment}
          >
            <Icon name="message-circle" size={hp(2.5)} color="white" />
            <Text style={styles.commentButtonText}>Add Comment</Text>
          </TouchableOpacity>
        </View>
        
        {/* Comments section header */}
        <View style={styles.commentsHeader}>
          <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
          {comments.length > 0 && (
            <TouchableOpacity 
              onPress={handleComment}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Comments list */}
        <View style={styles.commentsList}>
          {commentsLoading ? (
            <View style={styles.commentsLoading}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading comments...</Text>
            </View>
          ) : comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Be the first to comment!</Text>
          ) : (
            comments.slice(0, 3).map(comment => (
              <View key={comment.id} style={styles.commentItem}>
                <TouchableOpacity 
                  onPress={() => router.push({
                    pathname: '/profile/[id]',
                    params: { id: comment.profiles.id }
                  })}
                  style={styles.commentAvatar}
                >
                  <Avatar 
                    uri={comment.profiles.image}
                    size={hp(5)}
                    rounded={theme.radius.xl}
                  />
                </TouchableOpacity>
                <View style={styles.commentContent}>
                  <Text style={styles.commentAuthor}>{comment.profiles.name}</Text>
                  <Text style={styles.commentText}>{comment.text}</Text>
                  <Text style={styles.commentTime}>
                    {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
            ))
          )}
          
          {comments.length > 3 && (
            <TouchableOpacity 
              style={styles.moreCommentsButton}
              onPress={handleComment}
            >
              <Text style={styles.moreCommentsText}>View more comments...</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

export default PostDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: hp(1),
    fontSize: hp(1.8),
    color: theme.colors.textLight,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: hp(2),
    gap: wp(3),
  },
  username: {
    fontSize: hp(2),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  time: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
    marginTop: hp(0.5),
  },
  contentContainer: {
    marginBottom: hp(2),
  },
  bodyText: {
    fontSize: hp(2),
    lineHeight: hp(3),
    color: theme.colors.text,
    marginBottom: hp(2),
  },
  mediaContainer: {
    width: '100%',
    height: hp(40),
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    marginBottom: hp(2),
    backgroundColor: theme.colors.gray,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: hp(3),
  },
  commentButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(5),
    borderRadius: theme.radius.xl,
    gap: wp(2),
  },
  commentButtonText: {
    color: 'white',
    fontSize: hp(1.8),
    fontWeight: theme.fonts.medium,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  commentsTitle: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  viewAllButton: {
    padding: hp(1),
  },
  viewAllText: {
    fontSize: hp(1.6),
    color: theme.colors.primary,
    fontWeight: theme.fonts.medium,
  },
  commentsList: {
    marginBottom: hp(5),
  },
  commentsLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    height: hp(10),
  },
  noComments: {
    textAlign: 'center',
    fontSize: hp(1.7),
    color: theme.colors.textLight,
    paddingVertical: hp(3),
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: hp(2),
    gap: wp(2),
  },
  commentAvatar: {
    marginTop: hp(0.5),
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
  moreCommentsButton: {
    alignItems: 'center',
    paddingVertical: hp(1.5),
  },
  moreCommentsText: {
    fontSize: hp(1.7),
    color: theme.colors.primary,
    fontWeight: theme.fonts.medium,
  },
}); 