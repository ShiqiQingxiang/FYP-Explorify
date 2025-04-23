import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Dimensions, SafeAreaView } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { theme } from '../../constants/theme'
import { hp, wp } from '../../helpers/common'
import Icon from '../../assets/icons'
import { useAuth } from '../../contexts/AuthContext'

const { width } = Dimensions.get('window');

const SpotDetail = () => {
  const params = useLocalSearchParams();
  const spotId = params.id;
  const router = useRouter();
  const { user } = useAuth();
  const [spot, setSpot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 从Supabase获取景点详情
  useEffect(() => {
    const fetchSpotDetails = async () => {
      if (!spotId) {
        setError("Missing spot ID");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('tourist_spots')
          .select('*')
          .eq('id', spotId)
          .single();
        
        if (error) {
          console.error('Failed to fetch spot details:', error);
          setError("Cannot load spot information");
          return;
        }
        
        if (data) {
          setSpot(data);
          console.log('Loaded spot details:', data.name);
        } else {
          setError("Spot not found");
        }
      } catch (err) {
        console.error('Exception loading spot details:', err);
        setError("Error loading spot information");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpotDetails();
  }, [spotId]);

  // 启动任务挑战
  const startChallenge = () => {
    if (!spot) return;
    
    // 跳转到任务页面并传递景点信息
    router.push({
      pathname: 'task',
      params: {
        id: spot.id,
        title: spot.name,
        description: spot.description,
        latitude: spot.latitude,
        longitude: spot.longitude,
        taskTitle: spot.task_title || 'Photo Challenge',
        taskDescription: spot.task_description || 'Take a photo that showcases this attraction',
        taskType: spot.task_type || 'photo'
      }
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading spot information...</Text>
      </View>
    );
  }

  if (error || !spot) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="threeDotsCircle" size={hp(5)} color={theme.colors.error} />
        <Text style={styles.errorText}>{error || "Unknown error"}</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* 头部图片 */}
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: spot.image_url || 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1738&q=80' }} 
          style={styles.headerImage}
          resizeMode="cover"
        />
        <SafeAreaView style={styles.headerOverlay}>
          <TouchableOpacity 
            style={styles.backIconButton} 
            onPress={() => router.back()}
          >
            <Icon name="arrowLeft" size={hp(3)} color="white" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionButton}>
              <Icon name="heart" size={hp(3)} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionButton}>
              <Icon name="share" size={hp(3)} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
      
      <ScrollView style={styles.detailsContainer} showsVerticalScrollIndicator={false}>
        {/* 景点名称和类别 */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{spot.name}</Text>
          {spot.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{spot.category}</Text>
            </View>
          )}
        </View>
        
        {/* 评分和位置 */}
        <View style={styles.metaContainer}>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={hp(2)} color={theme.colors.warning} />
            <Text style={styles.ratingText}>{spot.rating || 4.5}</Text>
            <Text style={styles.ratingCount}>(120+)</Text>
          </View>
          <View style={styles.locationContainer}>
            <Icon name="location" size={hp(2)} color={theme.colors.primary} />
            <Text style={styles.locationText}>{spot.address || 'Unknown location'}</Text>
          </View>
        </View>
        
        {/* 任务挑战按钮 */}
        <TouchableOpacity 
          style={styles.challengeButton}
          onPress={startChallenge}
        >
          <Icon name="award" size={hp(2.5)} color="white" />
          <Text style={styles.challengeButtonText}>Start Challenge</Text>
        </TouchableOpacity>
        
        {/* 描述标题 */}
        <Text style={styles.sectionTitle}>Description</Text>
        
        {/* 描述内容 */}
        <Text style={styles.description}>
          {spot.description || 'No description available'}
        </Text>
        
        {/* 基本信息 */}
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.infoContainer}>
          {spot.open_hours && (
            <View style={styles.infoItem}>
              <Icon name="clock" size={hp(2)} color={theme.colors.textLight} />
              <Text style={styles.infoLabel}>Opening Hours:</Text>
              <Text style={styles.infoValue}>{spot.open_hours}</Text>
            </View>
          )}
          
          {spot.ticket_price && (
            <View style={styles.infoItem}>
              <Icon name="ticket" size={hp(2)} color={theme.colors.textLight} />
              <Text style={styles.infoLabel}>Ticket Price:</Text>
              <Text style={styles.infoValue}>{spot.ticket_price}</Text>
            </View>
          )}
          
          {spot.website && (
            <View style={styles.infoItem}>
              <Icon name="globe" size={hp(2)} color={theme.colors.textLight} />
              <Text style={styles.infoLabel}>Website:</Text>
              <Text style={[styles.infoValue, styles.linkText]}>{spot.website}</Text>
            </View>
          )}
          
          {spot.contact && (
            <View style={styles.infoItem}>
              <Icon name="call" size={hp(2)} color={theme.colors.textLight} />
              <Text style={styles.infoLabel}>Contact:</Text>
              <Text style={styles.infoValue}>{spot.contact}</Text>
            </View>
          )}
        </View>
        
        {/* 留出底部空间 */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      
      {/* 底部固定按钮 */}
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.mapButton}
          onPress={() => router.push({
            pathname: 'map',
            params: { spotId: spot.id }
          })}
        >
          <Icon name="map" size={hp(2.2)} color={theme.colors.primary} />
          <Text style={styles.mapButtonText}>View on Map</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.startButton}
          onPress={startChallenge}
        >
          <Text style={styles.startButtonText}>Start Task</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default SpotDetail

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: hp(2),
    color: theme.colors.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: wp(5),
  },
  errorText: {
    marginTop: hp(2),
    fontSize: hp(2),
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: hp(3),
  },
  backButton: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
  },
  backButtonText: {
    color: 'white',
    fontWeight: theme.fonts.medium,
    fontSize: hp(1.8),
  },
  imageContainer: {
    height: hp(35),
    width: '100%',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: StatusBar.currentHeight + hp(2),
    paddingHorizontal: wp(4),
    paddingBottom: hp(2),
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  backIconButton: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: wp(2),
  },
  headerActionButton: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: wp(5),
    marginTop: hp(-5),
    borderTopLeftRadius: hp(3),
    borderTopRightRadius: hp(3),
    backgroundColor: 'white',
  },
  titleContainer: {
    marginTop: hp(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: hp(3),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.full,
    marginLeft: wp(2),
  },
  categoryText: {
    fontSize: hp(1.5),
    color: theme.colors.primary,
    fontWeight: theme.fonts.medium,
  },
  metaContainer: {
    marginTop: hp(1.5),
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp(4),
  },
  ratingText: {
    marginLeft: wp(1),
    fontSize: hp(1.8),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  ratingCount: {
    fontSize: hp(1.6),
    color: theme.colors.textLight,
    marginLeft: wp(1),
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    marginLeft: wp(1),
    fontSize: hp(1.6),
    color: theme.colors.textLight,
    flex: 1,
  },
  challengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: hp(1.5),
    marginTop: hp(3),
    marginBottom: hp(1),
  },
  challengeButtonText: {
    color: 'white',
    fontWeight: theme.fonts.semibold,
    fontSize: hp(1.8),
    marginLeft: wp(2),
  },
  sectionTitle: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
    marginTop: hp(3),
    marginBottom: hp(1),
  },
  description: {
    fontSize: hp(1.8),
    lineHeight: hp(2.8),
    color: theme.colors.text,
  },
  infoContainer: {
    marginTop: hp(1),
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: hp(0.8),
  },
  infoLabel: {
    fontSize: hp(1.7),
    fontWeight: theme.fonts.medium,
    color: theme.colors.text,
    marginLeft: wp(2),
    width: wp(20),
  },
  infoValue: {
    fontSize: hp(1.7),
    color: theme.colors.textLight,
    flex: 1,
  },
  linkText: {
    color: theme.colors.primary,
  },
  bottomSpacer: {
    height: hp(10),
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    marginRight: wp(3),
  },
  mapButtonText: {
    color: theme.colors.primary,
    fontWeight: theme.fonts.medium,
    fontSize: hp(1.8),
    marginLeft: wp(2),
  },
  startButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: hp(1.5),
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'white',
    fontWeight: theme.fonts.semibold,
    fontSize: hp(1.8),
  },
}) 