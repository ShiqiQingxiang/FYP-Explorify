import { StyleSheet, Text, View, TextInput, TouchableOpacity, Dimensions, StatusBar, Alert, Animated, Image } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import { theme } from '../../constants/theme'
import { hp, wp } from '../../helpers/common'
import Icon from '../../assets/icons'
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'

// 预设的旅游景点数据
// 这是一个示例，开发者可以根据需要添加更多景点
const TOURIST_ATTRACTIONS = [
  {
    id: '1',
    title: '埃菲尔铁塔',
    description: '法国巴黎的标志性建筑，于1889年完工，高300米。是世界上最具代表性的建筑之一。',
    coordinate: {
      latitude: 48.8584,
      longitude: 2.2945,
    },
    address: '巴黎, 法国',
    category: '地标建筑',
    rating: 4.7,
    photos: [],
    dateAdded: '2023-01-15T00:00:00.000Z',
    openHours: '9:00 AM - 11:45 PM',
    ticketPrice: '€26.10',
    website: 'https://www.toureiffel.paris/',
    contact: '+33 892 70 12 39'
  },
  {
    id: '2',
    title: '故宫博物院',
    description: '中国北京的明清两代的皇家宫殿，是中国古代宫廷建筑之精华。世界五大宫之一，世界文化遗产。',
    coordinate: {
      latitude: 39.9163,
      longitude: 116.3972,
    },
    address: '北京市东城区景山前街4号',
    category: '历史景点',
    rating: 4.9,
    photos: [],
    dateAdded: '2023-01-20T00:00:00.000Z',
    openHours: '8:30 AM - 5:00 PM (周一闭馆)',
    ticketPrice: '¥60',
    website: 'https://www.dpm.org.cn/',
    contact: '+86 10 8500 7428'
  },
  {
    id: '3',
    title: '大峡谷国家公园',
    description: '位于美国亚利桑那州西北部的科罗拉多高原上，由科罗拉多河经过数百万年冲刷而成，是世界上最壮观的自然奇观之一。',
    coordinate: {
      latitude: 36.1069,
      longitude: -112.1129,
    },
    address: '亚利桑那州, 美国',
    category: '自然景观',
    rating: 4.8,
    photos: [],
    dateAdded: '2023-02-05T00:00:00.000Z',
    openHours: '全天开放',
    ticketPrice: '$35/车',
    website: 'https://www.nps.gov/grca/',
    contact: '+1 928-638-7888'
  },
];

const Map = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [region, setRegion] = useState({
    latitude: 39.9163, // 默认位置为故宫博物院
    longitude: 116.3972,
    latitudeDelta: 40, // 初始缩放级别较大，以便显示全球景点
    longitudeDelta: 40,
  });
  const router = useRouter();
  const mapRef = useRef(null);
  // 使用预设的旅游景点数据
  const [attractions, setAttractions] = useState(TOURIST_ATTRACTIONS);
  const [selectedAttraction, setSelectedAttraction] = useState(null);
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Location permission is required');
          return;
        }

        // 获取当前位置
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest
        });
        
        setLocation(location);
        
        // 初始化地图位置
        // 注意：这里不会自动移动到用户当前位置，而是保持对景点的关注
        
      } catch (error) {
        console.error("Error getting location:", error);
        setErrorMsg("Could not get your location");
      }
    })();
  }, []);

  // 显示或隐藏底部信息面板
  useEffect(() => {
    if (selectedAttraction) {
      // 显示底部信息面板
      Animated.spring(bottomSheetAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }).start();
    } else {
      // 隐藏底部信息面板
      Animated.timing(bottomSheetAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedAttraction]);

  // 前往用户当前位置
  const goToCurrentLocation = () => {
    if (location) {
      const currentRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      mapRef.current.animateToRegion(currentRegion, 1000);
    }
  };

  // 处理景点标记点击
  const handleAttractionPress = (attraction) => {
    console.log("Attraction pressed:", attraction.title);
    setSelectedAttraction(attraction);
  };

  // 关闭底部信息面板
  const closeBottomSheet = () => {
    setSelectedAttraction(null);
  };

  // 显示景点路线
  const showDirections = (attraction) => {
    Alert.alert(
      "Directions",
      `Get directions to ${attraction.title}`,
      [{ text: "OK" }]
    );
    // 在这里可以集成导航服务
  };

  // 分享景点信息
  const shareAttraction = (attraction) => {
    Alert.alert(
      "Share",
      `Share ${attraction.title}`,
      [{ text: "OK" }]
    );
    // 在这里可以集成分享功能
  };

  // 底部信息面板的动画样式
  const bottomSheetTranslateY = bottomSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
    extrapolate: 'clamp',
  });

  // 前往某个特定景点
  const goToAttraction = (attraction) => {
    if (mapRef.current) {
      const region = {
        latitude: attraction.coordinate.latitude,
        longitude: attraction.coordinate.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      mapRef.current.animateToRegion(region, 1000);
      setSelectedAttraction(attraction);
    }
  };

  // 搜索景点
  const searchAttractions = () => {
    if (!searchText.trim()) {
      return;
    }
    
    const lowerCaseSearch = searchText.toLowerCase();
    const found = attractions.find(attraction => 
      attraction.title.toLowerCase().includes(lowerCaseSearch) || 
      attraction.description.toLowerCase().includes(lowerCaseSearch)
    );
    
    if (found) {
      goToAttraction(found);
    } else {
      Alert.alert("Not Found", "No attractions found matching your search.");
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar translucent backgroundColor="transparent" />
      
      {/* 地图 */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          rotateEnabled={true}
          zoomEnabled={true}
          onPress={() => {
            // 点击地图空白处不做任何响应
          }}
        >
          {/* 显示旅游景点标记 */}
          {attractions.map(attraction => (
            <Marker
              key={attraction.id}
              coordinate={attraction.coordinate}
              title={attraction.title}
              description={attraction.description}
              onPress={() => handleAttractionPress(attraction)}
            >
              {/* 可以自定义标记的外观 */}
              <View style={styles.customMarker}>
                <Icon name="location" size={hp(3)} color={theme.colors.primary} />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* 控制按钮 */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={goToCurrentLocation}>
            <Icon name="location" size={hp(3)} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={() => {
              // 显示所有景点列表，这里可以实现一个弹出列表
              Alert.alert(
                "Tourist Attractions",
                "Select an attraction to view:",
                attractions.map(attraction => ({
                  text: attraction.title,
                  onPress: () => goToAttraction(attraction)
                }))
              );
            }}
          >
            <Icon name="search" size={hp(3)} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        {/* 搜索栏 */}
        <View style={styles.searchContainerAbsolute}>
          <View style={styles.searchBar}>
            <Icon name="search" size={hp(2.5)} color={theme.colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search attractions..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor={theme.colors.textLight}
              onSubmitEditing={searchAttractions}
              returnKeyType="search"
            />
          </View>
        </View>

        {/* 景点信息面板 */}
        {selectedAttraction && (
          <Animated.View 
            style={[
              styles.bottomSheet, 
              { transform: [{ translateY: bottomSheetTranslateY }] }
            ]}
          >
            <View style={styles.bottomSheetHandle} />
            <View style={styles.bottomSheetContent}>
              <View style={styles.bottomSheetHeader}>
                <View style={{flex: 1}}>
                  <Text style={styles.locationTitle}>{selectedAttraction.title}</Text>
                  <Text style={styles.locationCategory}>{selectedAttraction.category}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={closeBottomSheet}
                >
                  <Icon name="arrowLeft" size={18} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.locationDetails}>
                <View style={styles.detailItem}>
                  <Icon name="location" size={18} color={theme.colors.textLight} />
                  <Text style={styles.detailText}>{selectedAttraction.address}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Icon name="edit" size={18} color={theme.colors.textLight} />
                  <Text style={styles.detailText}>Added on {new Date(selectedAttraction.dateAdded).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.descriptionText}>{selectedAttraction.description}</Text>
                
                {/* 附加景点信息 */}
                {selectedAttraction.openHours && (
                  <View style={styles.detailItem}>
                    <Icon name="home" size={18} color={theme.colors.textLight} />
                    <Text style={styles.detailText}>Open: {selectedAttraction.openHours}</Text>
                  </View>
                )}
                
                {selectedAttraction.ticketPrice && (
                  <View style={styles.detailItem}>
                    <Icon name="home" size={18} color={theme.colors.textLight} />
                    <Text style={styles.detailText}>Ticket: {selectedAttraction.ticketPrice}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    // 跳转到任务页面，并传递景点信息
                    router.push({
                      pathname: 'task',
                      params: {
                        id: selectedAttraction.id,
                        title: selectedAttraction.title,
                        description: selectedAttraction.description
                      }
                    });
                  }}
                >
                  <Icon name="plus" size={22} color={theme.colors.primary} />
                  <Text style={styles.actionText}>任务挑战</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
    </View>
    
      {/* 底部导航栏 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('home')}>
          <Icon name="home" size={hp(3)} color={theme.colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('search')}>
          <Icon name="search" size={hp(3)} color={theme.colors.text} />
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

export default Map

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  searchContainerAbsolute: {
    position: 'absolute',
    top: StatusBar.currentHeight + hp(2),
    left: 0,
    right: 0,
    paddingHorizontal: wp(4),
    zIndex: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: theme.radius.lg,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    height: hp(5),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: wp(1.5),
    fontSize: hp(1.6),
    color: theme.colors.text,
    padding: 0,
  },
  controls: {
    position: 'absolute',
    right: wp(4),
    bottom: hp(10),
    gap: hp(2),
  },
  controlButton: {
    width: hp(5.5),
    height: hp(5.5),
    backgroundColor: 'white',
    borderRadius: hp(2.75),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
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
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: wp(4),
    paddingBottom: hp(10),
    paddingTop: hp(1),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
    zIndex: 90,
  },
  bottomSheetHandle: {
    alignSelf: 'center',
    width: wp(15),
    height: 5,
    backgroundColor: theme.colors.gray,
    borderRadius: 10,
    marginBottom: hp(2),
  },
  bottomSheetContent: {
    gap: hp(2),
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationTitle: {
    fontSize: hp(2.5),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  locationCategory: {
    fontSize: hp(1.7),
    color: theme.colors.textLight,
  },
  closeButton: {
    padding: 4,
  },
  locationDetails: {
    gap: hp(1),
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  detailText: {
    fontSize: hp(1.6),
    color: theme.colors.textLight,
  },
  descriptionText: {
    fontSize: hp(1.7),
    color: theme.colors.text,
    marginTop: hp(1),
    lineHeight: hp(2.4),
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(2),
    paddingTop: hp(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
  },
  actionText: {
    fontSize: hp(1.6),
    color: theme.colors.text,
    fontWeight: theme.fonts.medium,
  },
})