import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, StatusBar, Image } from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router'
import { theme } from '../../constants/theme'
import { hp, wp } from '../../helpers/common'
import Icon from '../../assets/icons'
import { useAuth } from '../../contexts/AuthContext'
import Avatar from '../../components/Avatar'

const Search = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('Most Viewed');

  const categories = [
    { id: 1, name: 'Most Popular' },
    { id: 2, name: 'Nearby' },
    { id: 3, name: 'Trending' },
    { id: 4, name: 'Latest' },
  ];

  const destinations = [
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
              placeholder="Search for places, hotels, etc..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor={theme.colors.textLight}
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

        {/* 类别选择 */}
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

        {/* 目的地卡片 */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.destinationsContainer}
        >
          {destinations.map(destination => (
            <TouchableOpacity 
              key={destination.id}
              style={styles.destinationCard}
              onPress={() => router.push(`destination/${destination.id}`)}
            >
              <Image 
                source={{ uri: destination.image }} 
                style={styles.destinationImage} 
                resizeMode="cover"
              />
              <View style={styles.destinationInfo}>
                <Text style={styles.destinationName}>
                  {destination.name}, {destination.country}
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
        </ScrollView>
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
            <Icon name="plus" size={hp(3)} color="white" />
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
  categoriesContainer: {
    paddingHorizontal: wp(4),
    gap: wp(3),
    marginBottom: hp(2.5),
  },
  categoryItem: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.8),
    borderRadius: theme.radius.full,
    backgroundColor: '#f1f1f1',
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
  destinationsContainer: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(15),
    gap: wp(3),
  },
  destinationCard: {
    width: wp(45),
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