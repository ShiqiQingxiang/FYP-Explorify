import { Alert, ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { hp, wp } from '../../helpers/common'
import { theme } from '../../constants/theme'
import Icon from '../../assets/icons'
import { useRouter } from 'expo-router'
import Avatar from '../../components/Avatar'
import PostItem from '../../components/PostItem'
import { getAllPosts } from '../../services/postService'

const Home = () => {

  const {user, setAuth} = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    const res = await getAllPosts();
    setLoading(false);
    
    if (res.success) {
      setPosts(res.data);
    } else {
      Alert.alert('Error', res.msg);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const renderItem = ({ item }) => <PostItem post={item} onRefresh={onRefresh} />;

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : (
        <Text style={styles.noPosts}>No posts yet</Text>
      )}
    </View>
  );

  return (
    <ScreenWrapper bg="white">
      <View style={styles.container}>
        {/* Header */}  
        <View style={styles.header}>
          <Text style={styles.title}>Explorify</Text>
          <View style={styles.icons}>
            <Pressable onPress={() => router.push('myPosts')}>
              <Icon name="user" size={hp(3.2)} strokeWidth={2} color={theme.colors.text}/>
            </Pressable>
            <Pressable onPress={() => router.push('favouritePosts')}>
              <Icon name="heart" size={hp(3.2)} strokeWidth={2} color={theme.colors.text}/>
            </Pressable>
            <Pressable onPress={() => router.push('newPost')}>
              <Icon name="plus" size={hp(3.2)} strokeWidth={2} color={theme.colors.text}/>
            </Pressable>
            <Pressable onPress={() => router.push('profile')}>
              <Avatar
                uri={user?.image}
                size={hp(4.3)}
                rounded={theme.radius.sm}
                style={{borderWidth: 2}}
              />
            </Pressable>
          </View>
        </View>
        
        {/* Posts list */}
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listStyle}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
        />
        
        {/* Bottom navigation */}
        <View style={styles.bottomNav}>
          <Pressable style={styles.navItem} onPress={() => router.push('home')}>
            <Icon name="home" size={hp(3)} color={theme.colors.primary} />
          </Pressable>
          
          <Pressable style={styles.navItem} onPress={() => router.push('search')}>
            <Icon name="search" size={hp(3)} color={theme.colors.text} />
          </Pressable>
          
          <Pressable style={styles.navItem} onPress={() => router.push('map')}>
            <View style={styles.addButton}>
              <Icon name="navigation" size={hp(3)} color="white" />
            </View>
          </Pressable>
          
          <Pressable style={styles.navItem} onPress={() => router.push('chat')}>
            <Icon name="mail" size={hp(3)} color={theme.colors.text} />
          </Pressable>
          
          <Pressable style={styles.navItem} onPress={() => router.push('profile')}>
            <Icon name="user" size={hp(3)} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  )
}

export default Home

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginHorizontal: wp(4),
  },
  title: {
    color: theme.colors.text,
    fontSize: hp(3.2),
    fontWeight: theme.fonts.bold,
  },
  avatrImage: {
    width: hp(4.3),
    height: hp(4.3),
    borderRadius: theme.radius.sm,
    borderCurve: 'continuous',
    borderColor: theme.colors.gray,
    borderWidth: 3,
  },
  icons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
  },
  listStyle: {
    paddingTop: 20,
    paddingHorizontal: wp(4),
  },
  noPosts: {
    fontSize: hp(2),
    textAlign: 'center',
    color: theme.colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: hp(30),
  },
  pill:{
    position: 'absolute',
    right: -10,
    top: -4,
    height: hp(2.2),
    width: hp(2.2),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: theme.colors.roseLight,
  },
  pillText: {
    color: 'white', 
    fontSize: hp(1.2),
    fontWeight: theme.fonts.bold,
  },
  Nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginHorizontal: wp(4),
    backgroundColor: 'gray',
  },
  bottomNav: {
    flexDirection: 'row',
    height: hp(8),
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: hp(1),
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    fontSize: hp(1.5),
    color: theme.colors.text,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    width: hp(6),
    height: hp(6),
    borderRadius: hp(3),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1),
  },
})