import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View, Alert, Modal } from 'react-native'
import React, { useEffect, useState } from 'react'
import { hp, wp } from '../helpers/common'
import { theme } from '../constants/theme'
import Avatar from './Avatar'
import Icon from '../assets/icons'
import { Video } from 'expo-av'
import { getSupabaseFileUrl } from '../services/imageService'
import { useRouter } from 'expo-router'
import { checkPostLike, getPostLikesCount, togglePostLike, deletePost } from '../services/postService'
import { useAuth } from '../contexts/AuthContext'

// Remove HTML tags function
const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<\/?[^>]+(>|$)/g, '');
}

const PostItem = ({ post, onRefresh }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isCurrentUserPost, setIsCurrentUserPost] = useState(false);

  const isVideo = post?.file && post.file.includes('postVideos');
  const isImage = post?.file && post.file.includes('postImages');
  
  const getFileUri = file => {
    if (!file) return null;
    return getSupabaseFileUrl(file)?.uri;
  }

  // Clean post content by removing HTML tags
  const cleanBody = stripHtml(post.body);

  // Check if current user is post owner
  useEffect(() => {
    if (user?.id && post?.userId) {
      setIsCurrentUserPost(user.id === post.userId);
    }
  }, [user, post]);

  // Load like status and count
  useEffect(() => {
    const loadLikeStatus = async () => {
      if (!post.id || !user?.id) return;
      
      // Check if user has liked this post
      const likeResult = await checkPostLike(post.id, user.id);
      if (likeResult.success) {
        setIsLiked(likeResult.isLiked);
      }

      // Get post likes count
      const countResult = await getPostLikesCount(post.id);
      if (countResult.success) {
        setLikesCount(countResult.count);
      }
    };

    loadLikeStatus();
  }, [post.id, user?.id]);

  // Handle like/unlike
  const handleLike = async () => {
    if (!user?.id) {
      Alert.alert('Note', 'Please login first');
      return;
    }

    setLoading(true);
    const result = await togglePostLike(post.id, user.id);
    setLoading(false);

    if (result.success) {
      setIsLiked(result.isLiked);
      setLikesCount(prev => result.isLiked ? prev + 1 : Math.max(0, prev - 1));
    } else {
      Alert.alert('Error', result.msg);
    }
  };

  // Handle comment
  const handleComment = () => {
    router.push({
      pathname: '/comments/[id]',
      params: { id: post.id }
    });
  };

  // Handle edit post
  const handleEditPost = () => {
    setShowOptions(false);
    router.push({
      pathname: '/editPost',
      params: { id: post.id }
    });
  };

  // Handle delete post
  const handleDeletePost = () => {
    setShowOptions(false);
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await deletePost(post.id);
            setLoading(false);
            
            if (result.success) {
              Alert.alert('Success', 'Post deleted successfully');
              if (onRefresh) {
                onRefresh();
              }
            } else {
              Alert.alert('Error', result.msg);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* User info header */}
      <View style={styles.header}>
        <Pressable 
          style={styles.userInfo} 
          onPress={() => router.push({
            pathname: '/profile/[id]',
            params: { id: post.profiles.id }
          })}
        >
          <Avatar 
            uri={post.profiles.image}
            size={hp(5.5)}
            rounded={theme.radius.xl}
          />
          <View>
            <Text style={styles.username}>{post.profiles.name}</Text>
            <Text style={styles.time}>
              {new Date(post.created_at).toLocaleDateString()}
            </Text>
          </View>
        </Pressable>
        
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => setShowOptions(true)}
        >
          <Icon name="more-horizontal" size={hp(2.5)} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Post content - using cleaned text */}
      {cleanBody && (
        <Pressable 
          onPress={() => router.push({
            pathname: '/postDetails/[id]',
            params: { id: post.id }
          })}
        >
          <Text style={styles.body}>{cleanBody}</Text>
        </Pressable>
      )}

      {/* Post media */}
      {isImage && (
        <Pressable 
          style={styles.media}
          onPress={() => router.push({
            pathname: '/postDetails/[id]',
            params: { id: post.id }
          })}
        >
          <Image 
            source={{ uri: getFileUri(post.file) }}
            style={styles.image}
            resizeMode="cover"
          />
        </Pressable>
      )}

      {isVideo && (
        <Pressable 
          style={styles.media}
          onPress={() => router.push({
            pathname: '/postDetails/[id]',
            params: { id: post.id }
          })}
        >
          <Video
            source={{ uri: getFileUri(post.file) }}
            style={styles.video}
            useNativeControls
            resizeMode="cover"
            isLooping
          />
        </Pressable>
      )}

      {/* Like count display */}
      {likesCount > 0 && (
        <View style={styles.likesContainer}>
          <Icon name="heart" size={hp(2)} color={theme.colors.primary} />
          <Text style={styles.likesCount}>{likesCount} likes</Text>
        </View>
      )}

      {/* Post actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleLike}
          disabled={loading}
        >
          <Icon 
            name="heart" 
            size={hp(2.5)} 
            color={isLiked ? theme.colors.primary : theme.colors.text} 
            fill={isLiked ? theme.colors.primary : 'transparent'}
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleComment}
        >
          <Icon name="message-circle" size={hp(2.5)} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showOptions}
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <View style={styles.modalContent}>
            {isCurrentUserPost && (
              <>
                <TouchableOpacity 
                  style={styles.modalItem}
                  onPress={handleEditPost}
                >
                  <Icon name="edit" size={hp(2.5)} color={theme.colors.text} />
                  <Text style={styles.modalItemText}>Edit Post</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalItem}
                  onPress={handleDeletePost}
                >
                  <Icon name="delete" size={hp(2.5)} color={theme.colors.roseLight} />
                  <Text style={[styles.modalItemText, { color: theme.colors.roseLight }]}>Delete Post</Text>
                </TouchableOpacity>
              </>
            )}
            
            <TouchableOpacity 
              style={styles.modalItem}
              onPress={() => {
                setShowOptions(false);
                router.push({
                  pathname: '/postDetails/[id]',
                  params: { id: post.id }
                });
              }}
            >
              <Icon name="mail" size={hp(2.5)} color={theme.colors.text} />
              <Text style={styles.modalItemText}>View Post Details</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalItem, styles.modalItemLast]}
              onPress={() => setShowOptions(false)}
            >
              <Icon name="arrowLeft" size={hp(2.5)} color={theme.colors.text} />
              <Text style={styles.modalItemText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

export default PostItem

const styles = StyleSheet.create({
  container: {
    marginBottom: hp(2),
    backgroundColor: 'white',
    borderRadius: theme.radius.md,
    padding: hp(2),
    borderColor: theme.colors.gray,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  username: {
    fontSize: hp(1.8),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  time: {
    fontSize: hp(1.4),
    color: theme.colors.textLight,
  },
  moreButton: {
    padding: 5,
  },
  body: {
    fontSize: hp(1.8),
    color: theme.colors.text,
    marginBottom: hp(1.5),
    lineHeight: hp(2.5),
  },
  media: {
    height: hp(25),
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    marginBottom: hp(1.5),
  },
  image: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    marginBottom: hp(1),
  },
  likesCount: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray,
    paddingTop: hp(1.5),
    gap: wp(4),
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: hp(5),
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray,
    gap: wp(3),
  },
  modalItemLast: {
    borderBottomWidth: 0,
  },
  modalItemText: {
    fontSize: hp(1.8),
    color: theme.colors.text,
  },
}) 