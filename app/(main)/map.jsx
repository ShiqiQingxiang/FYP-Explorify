import { StyleSheet, Text, View, TextInput, TouchableOpacity, Dimensions, StatusBar } from 'react-native'
import React, { useState, useEffect } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import { theme } from '../../constants/theme'
import { hp, wp } from '../../helpers/common'
import Icon from '../../assets/icons'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'

const Map = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchText, setSearchText] = useState('');
  const router = useRouter();
  const [markers, setMarkers] = useState([
    {
      id: 1,
      title: '风景点',
      description: '这里风景很美',
      coordinate: {
        latitude: 31.2304,
        longitude: 121.4737,
      }
    },
    {
      id: 2,
      title: '美食街',
      description: '这里有很多美食',
      coordinate: {
        latitude: 31.2404,
        longitude: 121.4837,
      }
    }
  ]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('需要位置权限');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

  const initialRegion = location ? {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  } : {
    latitude: 31.2304,
    longitude: 121.4737,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const goToCurrentLocation = () => {
    if (location) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 1000);
    }
  };

  const mapRef = React.useRef(null);

  return (
    <View style={styles.mainContainer}>
      <StatusBar translucent backgroundColor="transparent" />
      
      {/* 地图 */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {markers.map(marker => (
            <Marker
              key={marker.id}
              coordinate={marker.coordinate}
              title={marker.title}
              description={marker.description}
            />
          ))}
        </MapView>

        {/* 控制按钮 */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={goToCurrentLocation}>
            <Icon name="location" size={hp(3)} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <Icon name="plus" size={hp(3)} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        {/* 搜索栏 - 使用绝对定位 */}
        <View style={styles.searchContainerAbsolute}>
          <View style={styles.searchBar}>
            <Icon name="search" size={hp(2.5)} color={theme.colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="搜索地点..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor={theme.colors.textLight}
            />
          </View>
        </View>
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