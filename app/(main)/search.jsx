import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, StatusBar, Image, ActivityIndicator } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { theme } from '../../constants/theme'
import { hp, wp } from '../../helpers/common'
import Icon from '../../assets/icons'
import { useAuth } from '../../contexts/AuthContext'
import Avatar from '../../components/Avatar'
import { supabase } from '../../lib/supabase'

const Search = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [spotCategories, setSpotCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [destinations, setDestinations] = useState([]);
  const [filteredDestinations, setFilteredDestinations] = useState([]);

  // 从Supabase获取景点标签
  useEffect(() => {
    const fetchSpotCategories = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('tourist_spots')
          .select('category')
          .order('category');
        
        if (error) {
          console.error('Error fetching spot categories:', error);
          return;
        }
        
        if (data && data.length > 0) {
          // 提取唯一的标签类别
          const uniqueCategories = [...new Set(data.map(spot => spot.category))];
          // 转换为UI需要的格式
          const formattedCategories = uniqueCategories
            .filter(category => category) // 过滤掉null或空字符串
            .map((category, index) => ({
              id: index + 1,
              name: category
            }));
          
          setSpotCategories(formattedCategories);
          // 设置第一个类别为默认活跃类别
          if(formattedCategories.length > 0 && !activeCategory) {
            setActiveCategory(formattedCategories[0].name);
          }
          console.log('Loaded', formattedCategories.length, 'spot categories from Supabase');
        }
      } catch (error) {
        console.error('Exception fetching spot categories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpotCategories();
  }, []);

  // 从Supabase获取景点数据
  useEffect(() => {
    const fetchTouristSpots = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('tourist_spots')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching tourist spots:', error);
          return;
        }
        
        if (data && data.length > 0) {
          // 转换数据格式以匹配应用需要的结构
          const formattedData = data.map(spot => ({
            id: spot.id,
            name: spot.name,
            country: spot.address?.split(',').pop()?.trim() || 'Unknown location',
            image: spot.image_url || 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1738&q=80',
            rating: spot.rating || 4.0,
            category: spot.category,
            description: spot.description,
            coordinate: {
              latitude: spot.latitude,
              longitude: spot.longitude,
            }
          }));
          
          setDestinations(formattedData);
          setFilteredDestinations(formattedData);
          console.log('Loaded', formattedData.length, 'tourist spots from Supabase');
        }
      } catch (error) {
        console.error('Exception fetching tourist spots:', error);
        // 使用默认数据作为备用
        setDestinations(DEFAULT_DESTINATIONS);
        setFilteredDestinations(DEFAULT_DESTINATIONS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTouristSpots();
  }, []);

  // 当活跃类别改变时过滤景点
  useEffect(() => {
    if (!activeCategory || activeCategory === 'All') {
      setFilteredDestinations(destinations);
      return;
    }

    const filtered = destinations.filter(
      destination => destination.category === activeCategory
    );
    
    setFilteredDestinations(filtered);
    console.log(`Filtered to ${filtered.length} spots with category "${activeCategory}"`);
  }, [activeCategory, destinations]);

  // 使用从Supabase获取的标签，如果没有则使用默认标签
  const categories = spotCategories.length > 0 
    ? [{ id: 0, name: 'All' }, ...spotCategories] 
    : [
        { id: 0, name: 'All' },
        { id: 1, name: 'Most Popular' },
        { id: 2, name: 'Nearby' },
        { id: 3, name: 'Trending' },
        { id: 4, name: 'Latest' },
      ];

  // 备用景点数据
  const DEFAULT_DESTINATIONS = [
    {
      id: 1,
      name: 'Bali',
      country: 'Indonesia',
      image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1738&q=80',
      rating: 4.5,
    },
    {
      id: 2,
      name: 'Paris',
      country: 'France',
      image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1520&q=80',
      rating: 4.7,
    },
    {
      id: 3,
      name: 'Kyoto',
      country: 'Japan',
      image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
      rating: 4.8,
    },
  ];

  // 搜索功能
  const handleSearch = () => {
    if (!searchText.trim()) {
      // 如果搜索框为空，恢复按类别过滤的结果
      if (!activeCategory || activeCategory === 'All') {
        setFilteredDestinations(destinations);
      } else {
        const filtered = destinations.filter(
          destination => destination.category === activeCategory
        );
        setFilteredDestinations(filtered);
      }
      return;
    }
    
    const query = searchText.toLowerCase();
    const results = destinations.filter(
      destination => 
        destination.name.toLowerCase().includes(query) || 
        destination.country.toLowerCase().includes(query) ||
        (destination.description && destination.description.toLowerCase().includes(query))
    );
    
    setFilteredDestinations(results);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 顶部欢迎信息 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name || 'Traveler'} 👋</Text>
            <Text style={styles.subGreeting}>Explore the world.</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('profile')}>
            <Avatar
              uri={user?.image}
              size={hp(5)}
              rounded={theme.radius.xl}
            />
          </TouchableOpacity>
        </View>

        {/* 搜索框 */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={hp(2.5)} color={theme.colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for places, attractions, hotels..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor={theme.colors.textLight}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
        </View>

        {/* 热门目的地 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Destinations</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* 加载指示器 */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading attractions...</Text>
          </View>
        )}

        {/* 类别选择 - 改回横向滚动 */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map(category => (
            <TouchableOpacity 
              key={category.id}
              style={[
                styles.categoryItem,
                activeCategory === category.name && styles.activeCategoryItem
              ]}
              onPress={() => setActiveCategory(category.name)}
            >
              <Text 
                style={[
                  styles.categoryText,
                  activeCategory === category.name && styles.activeCategoryText
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 目的地卡片 - 改为网格布局 */}
        {!isLoading && (
          <>
            {filteredDestinations.length > 0 ? (
              <View style={styles.destinationsGrid}>
                {filteredDestinations.map(destination => (
                  <TouchableOpacity 
                    key={destination.id}
                    style={styles.destinationCard}
                    onPress={() => router.push({
                      pathname: 'spotDetail',
                      params: { id: destination.id }
                    })}
                  >
                    <Image 
                      source={{ uri: destination.image }} 
                      style={styles.destinationImage} 
                      resizeMode="cover"
                    />
                    <View style={styles.destinationInfo}>
                      <Text style={styles.destinationName}>
                        {destination.name}
                      </Text>
                      <View style={styles.locationContainer}>
                        <Icon name="location" size={hp(1.8)} color={theme.colors.textLight} />
                        <Text style={styles.destinationCountry}>{destination.country}</Text>
                      </View>
                    </View>
                    <View style={styles.ratingContainer}>
                      <Icon name="heart" size={hp(1.8)} color={theme.colors.primary} />
                      <Text style={styles.ratingText}>{destination.rating}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noResultsContainer}>
                <Icon name="search" size={hp(5)} color={theme.colors.textLight} />
                <Text style={styles.noResultsText}>No attractions found</Text>
                <TouchableOpacity 
                  style={styles.resetButton}
                  onPress={() => {
                    setActiveCategory('All');
                    setSearchText('');
                    setFilteredDestinations(destinations);
                  }}
                >
                  <Text style={styles.resetButtonText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* 底部导航栏 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('home')}>
          <Icon name="home" size={hp(3)} color={theme.colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('search')}>
          <Icon name="search" size={hp(3)} color={theme.colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('map')}>
          <View style={styles.addButton}>
            <Icon name="navigation" size={hp(3)} color="white" />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('chat')}>
          <Icon name="mail" size={hp(3)} color={theme.colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('profile')}>
          <Icon name="user" size={hp(3)} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default Search

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  scrollView: {
    flex: 1,
    paddingTop: StatusBar.currentHeight + hp(2),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    marginBottom: hp(2),
  },
  greeting: {
    fontSize: hp(2.8),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
  },
  subGreeting: {
    fontSize: hp(1.8),
    color: theme.colors.textLight,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: wp(4),
    marginBottom: hp(3),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: theme.radius.lg,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.5),
    height: hp(6),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: wp(2),
    fontSize: hp(1.8),
    color: theme.colors.text,
    padding: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    marginBottom: hp(2),
  },
  sectionTitle: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  viewAll: {
    fontSize: hp(1.7),
    color: theme.colors.primary,
    fontWeight: theme.fonts.medium,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: hp(5),
  },
  loadingText: {
    marginTop: hp(1),
    fontSize: hp(1.8),
    color: theme.colors.textLight,
  },
  categoriesContainer: {
    paddingHorizontal: wp(4),
    marginBottom: hp(2.5),
  },
  categoryItem: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.8),
    borderRadius: theme.radius.full,
    backgroundColor: '#f1f1f1',
    marginRight: wp(3),
  },
  activeCategoryItem: {
    backgroundColor: '#000',
  },
  categoryText: {
    fontSize: hp(1.7),
    fontWeight: theme.fonts.medium,
    color: theme.colors.textLight,
  },
  activeCategoryText: {
    color: 'white',
  },
  destinationsGrid: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(15),
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  destinationCard: {
    width: wp(44),
    height: hp(30),
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
    marginBottom: hp(3),
  },
  destinationImage: {
    width: '100%',
    height: '80%',
  },
  destinationInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'white',
  },
  destinationName: {
    fontSize: hp(1.8),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  destinationCountry: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
    marginLeft: 4,
  },
  ratingContainer: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
    fontWeight: theme.fonts.semibold,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: hp(5),
    paddingHorizontal: wp(4),
  },
  noResultsText: {
    marginTop: hp(1),
    fontSize: hp(1.8),
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  resetButton: {
    marginTop: hp(2),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
  },
  resetButtonText: {
    color: 'white',
    fontWeight: theme.fonts.medium,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
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