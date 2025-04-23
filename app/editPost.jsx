import { Alert, ActivityIndicator, Pressable, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import ScreenWrapper from '../components/ScreenWrapper'
import { wp, hp } from '../helpers/common'
import Header from '../components/Header'
import { theme } from '../constants/theme'
import { useAuth } from '../contexts/AuthContext'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Avatar from '../components/Avatar'
import RichTextEditor from '../components/RichTextEditor'
import Icon from '../assets/icons'
import Button from '../components/Button'
import * as ImagePicker from 'expo-image-picker'
import { getSupabaseFileUrl } from '../services/imageService'
import { Video } from 'expo-av'
import { supabase } from '../lib/supabase'
import { updatePost } from '../services/postService'

const EditPost = () => {
  const params = useLocalSearchParams();
  const postId = params.id;
  const { user } = useAuth();
  const bodyRef = useRef("");
  const editorRef = useRef(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [post, setPost] = useState(null);

  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single();
        
        if (error) {
          console.error('Error fetching post:', error);
          Alert.alert('Error', 'Failed to load post');
          router.back();
          return;
        }
        
        // Check if current user owns this post
        if (data.userId !== user?.id) {
          Alert.alert('Error', 'You can only edit your own posts');
          router.back();
          return;
        }
        
        setPost(data);
        if (data.body) {
          bodyRef.current = data.body;
          editorRef.current?.setContentHTML(data.body);
        }
        if (data.file) {
          setFile(data.file);
        }
        
        setInitialLoading(false);
      } catch (error) {
        console.error('Error in fetchPost:', error);
        Alert.alert('Error', 'An error occurred while loading the post');
        router.back();
      }
    };
    
    fetchPost();
  }, [postId, user?.id]);

  const onPick = async (isImage) => {
    let mediaConfig = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
    }
    if (!isImage) {
      mediaConfig = {
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
      }
    }
    let result = await ImagePicker.launchImageLibraryAsync(mediaConfig);

    if (!result.canceled) {
      setFile(result.assets[0]);
    }
  }

  const isLocalFile = file => {
    if (!file) return null;
    if (typeof file == 'object') return true;
    return false;
  }

  const getFileType = file => {
    if (!file) return null;
    if (isLocalFile(file)) {
      return file.type;
    }
    
    // check image or video
    if (file.includes('postImages')) {
      return 'image';
    }
    return 'video';
  }

  const getFileUri = file => {
    if (!file) return null;
    if (isLocalFile(file)) {
      return file.uri;
    }
    return getSupabaseFileUrl(file)?.uri;
  }

  const onSubmit = async () => {
    if (!bodyRef.current && !file) {
      Alert.alert('Post', 'Please choose an image or add post body');
      return;
    }

    const postData = {
      body: bodyRef.current,
    };
    
    // Only update file if it's a new one
    if (isLocalFile(file)) {
      postData.file = file;
    }
    
    setLoading(true);
    const res = await updatePost(postId, postData);
    setLoading(false);
    
    if (res.success) {
      Alert.alert('Success', 'Post updated successfully');
      router.back();
    } else {
      Alert.alert('Error', res.msg);
    }
  }

  if (initialLoading) {
    return (
      <ScreenWrapper>
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper bg="white">
      <View style={styles.container}>
        <Header title="Edit Post" />
        <ScrollView contentContainerStyle={{gap: 20}}>
          <View style={styles.header}>
            <Avatar
              uri={user?.image}
              size={hp(6.5)}
              rounded={theme.radius.xl}
            />
            <View style={{gap: 2}}>
              <Text style={styles.username}>
                {user && user.name}
              </Text>
              <Text style={styles.publicText}>
                Public
              </Text>
            </View>
          </View>

          <View style={styles.textEditor}>
            <RichTextEditor editorRef={editorRef} onChange={body => bodyRef.current = body} />
          </View>

          {file && (
            <View style={styles.file}>
              {getFileType(file) == 'video' ? (
                <Video
                  style={{flex: 1}}
                  source={{
                    uri: getFileUri(file),
                  }}
                  useNativeControls
                  resizeMode='cover'
                  isLooping
                />
              ) : (
                <Image source={{uri: getFileUri(file)}} resizeMode='cover' style={{flex: 1}} />
              )}

              <Pressable style={styles.closeIcon} onPress={() => setFile(null)}>
                <Icon name="delete" size={20} color="white" />
              </Pressable>
            </View>
          )}

          <View style={styles.media}>
            <Text style={styles.addImageText}>Add to your post</Text>
            <View style={styles.mediaIcons}>
              <TouchableOpacity onPress={() => onPick(true)}>
                <Icon name="image" size={30} color={theme.colors.dark} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onPick(false)}>
                <Icon name="video" size={33} color={theme.colors.dark} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        <Button
          buttonStyle={{height: hp(6.2)}}
          title="Update Post"
          loading={loading}
          hasShadow={false}
          onPress={onSubmit}
        />
      </View>
    </ScreenWrapper>
  )
}

export default EditPost

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 30,
    paddingHorizontal: wp(4),
    gap: 15,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: hp(1.8),
    color: theme.colors.textLight,
  },
  title: {
    fontSize: hp(2.5),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  username: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  avatar: {
    width: hp(6.5),
    height: hp(6.5),
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  publicText: {
    fontSize: hp(1.7),
    fontWeight: theme.fonts.medium,
    color: theme.colors.textLight,
  },
  textEditor: {
  },
  media: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    padding: 12,
    paddingHorizontal: 18,
    borderRadius: theme.radius.xl,
    borderCurve: 'continuous',
    borderColor: theme.colors.gray,
  },
  mediaIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  addImageText: {
    fontSize: hp(1.9),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  imageIcon: {
    borderRadius: theme.radius.md,
  },
  file: {
    height: hp(30),
    width: '100%',
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  closeIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    borderRadius: 50,
    backgroundColor: 'rgba(255,0,0,0.6)'
  }
}) 