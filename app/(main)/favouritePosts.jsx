import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import Header from '../../components/Header'
import { hp, wp } from '../../helpers/common'
import { theme } from '../../constants/theme'
import { useAuth } from '../../contexts/AuthContext'
import { getUserLikedPosts } from '../../services/postService'
import PostItem from '../../components/PostItem'

const FavouritePosts = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load user's liked posts
  const loadLikedPosts = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const result = await getUserLikedPosts(user.id);
    setLoading(false);

    if (result.success) {
      setPosts(result.data);
    } else {
      Alert.alert('Error', result.msg);
    }
  };

  // Pull to refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLikedPosts();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user?.id) {
      loadLikedPosts();
    }
  }, [user?.id]);

  const renderItem = ({ item }) => <PostItem post={item} />;

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : (
        <Text style={styles.emptyText}>
          You don't have any liked posts yet
        </Text>
      )}
    </View>
  );

  return (
    <ScreenWrapper contentContainerStyle={{paddingTop: 0}}>
      <View style={styles.container}>
        <Header title="My Favorites" containerStyle={{marginTop: 0, paddingTop: 10}} />

        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      </View>
    </ScreenWrapper>
  )
}

export default FavouritePosts

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  listContainer: {
    paddingTop: hp(1),
    paddingBottom: hp(2),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: hp(30),
  },
  emptyText: {
    fontSize: hp(1.8),
    color: theme.colors.textLight,
    textAlign: 'center',
  },
})