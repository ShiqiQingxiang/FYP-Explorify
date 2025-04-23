import { StyleSheet, Text, View, TextInput, TouchableOpacity, Dimensions, StatusBar, Alert, Animated, Image } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import { theme } from '../../constants/theme'
import { hp, wp } from '../../helpers/common'
import Icon from '../../assets/icons'
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

// Map style to show English labels
const mapStyle = [
  {
    "elementType": "labels",
    "stylers": [
      {
        "languageId": "en"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "labels.text",
    "stylers": [
      {
        "languageId": "en"
      }
    ]
  },
  {
    "featureType": "administrative.province",
    "elementType": "labels.text",
    "stylers": [
      {
        "languageId": "en"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text",
    "stylers": [
      {
        "languageId": "en"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text",
    "stylers": [
      {
        "languageId": "en"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text",
    "stylers": [
      {
        "languageId": "en"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text",
    "stylers": [
      {
        "languageId": "en"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text",
    "stylers": [
      {
        "languageId": "en"
      }
    ]
  }
];

// Default tourist attraction data (only for backup, actual data will be fetched from Supabase)
const DEFAULT_TOURIST_ATTRACTIONS = [
  {
    id: '1',
    title: 'Eiffel Tower',
    description: 'The iconic landmark in Paris, completed in 1889, standing at 300 meters tall. It is one of the most recognizable buildings in the world.',
    coordinate: {
      latitude: 48.8584,
      longitude: 2.2945,
    },
    address: 'Paris, France',
    category: 'Landmark',
    rating: 4.7,
    photos: [],
    dateAdded: '2023-01-15T00:00:00.000Z',
    openHours: '9:00 AM - 11:45 PM',
    ticketPrice: '€26.10',
    website: 'https://www.toureiffel.paris/',
    contact: '+33 892 70 12 39'
  },
  // ...other default attractions
];

const Map = () => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [region, setRegion] = useState({
    latitude: 39.9163, // Default position (Forbidden City)
    longitude: 116.3972,
    latitudeDelta: 40, // Initial zoom level to show global attractions
    longitudeDelta: 40,
  });
  const router = useRouter();
  const mapRef = useRef(null);
  // State for storing attraction data
  const [attractions, setAttractions] = useState([]);
  const [selectedAttraction, setSelectedAttraction] = useState(null);
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = useState(true);
  const [useSimulatedLocation, setUseSimulatedLocation] = useState(false);

  // Terracotta Army location constant
  const TERRACOTTA_ARMY_LOCATION = {
    coords: {
      latitude: 34.3841,
      longitude: 109.2785,
      accuracy: 5
    }
  };

  // Fetch tourist spots from Supabase
  const fetchTouristSpots = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('tourist_spots')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching tourist spots:', error);
        // If failed to fetch, use default data
        setAttractions(DEFAULT_TOURIST_ATTRACTIONS);
        return;
      }
      
      if (data && data.length > 0) {
        // Convert data format to match application structure
        const formattedData = data.map(spot => ({
          id: spot.id,
          title: spot.name,
          description: spot.description,
          coordinate: {
            latitude: spot.latitude,
            longitude: spot.longitude,
          },
          address: spot.address,
          category: spot.category,
          rating: spot.rating,
          photos: [],
          dateAdded: spot.created_at,
          openHours: spot.open_hours || null,
          ticketPrice: spot.ticket_price || null,
          website: spot.website || null,
          contact: spot.contact || null,
          taskTitle: spot.task_title || null,
          taskDescription: spot.task_description || null,
          taskPoints: spot.task_points || 10,
          taskType: spot.task_type || 'photo'
        }));
        
        setAttractions(formattedData);
        console.log('Loaded', formattedData.length, 'tourist spots from Supabase');
      } else {
        console.log('No tourist spots found in database, using defaults');
        setAttractions(DEFAULT_TOURIST_ATTRACTIONS);
      }
    } catch (error) {
      console.error('Exception fetching tourist spots:', error);
      setAttractions(DEFAULT_TOURIST_ATTRACTIONS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Get location and attraction data
    (async () => {
      try {
        // Request location permissions
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Location permission is required');
          return;
        }

        // If user chooses to use simulated location, set to Terracotta Army
        if (useSimulatedLocation) {
          setLocation(TERRACOTTA_ARMY_LOCATION);
          console.log("Using simulated location at Terracotta Army");
        } else {
          // Otherwise get real location
          let location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest
          });
          setLocation(location);
        }
        
        // Fetch attraction data from database
        await fetchTouristSpots();
        
      } catch (error) {
        console.error("Error getting location:", error);
        setErrorMsg("Could not get your location");
        
        // Even if getting location fails, still try to fetch attraction data
        await fetchTouristSpots();
      }
    })();
  }, [useSimulatedLocation]); // Add dependency, re-execute when simulated location state changes

  // Show or hide bottom info panel
  useEffect(() => {
    if (selectedAttraction) {
      // Show bottom info panel
      Animated.spring(bottomSheetAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }).start();
    } else {
      // Hide bottom info panel
      Animated.timing(bottomSheetAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedAttraction]);

  // Go to current location
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

  // Handle attraction press
  const handleAttractionPress = (attraction) => {
    console.log("Attraction pressed:", attraction.title);
    setSelectedAttraction(attraction);
  };

  // Close bottom info panel
  const closeBottomSheet = () => {
    setSelectedAttraction(null);
  };

  // Show attraction route
  const showDirections = (attraction) => {
    Alert.alert(
      "Directions",
      `Get directions to ${attraction.title}`,
      [{ text: "OK" }]
    );
    // Here you can integrate navigation services
  };

  // Share attraction information
  const shareAttraction = (attraction) => {
    Alert.alert(
      "Share",
      `Share ${attraction.title}`,
      [{ text: "OK" }]
    );
    // Here you can integrate sharing functionality
  };

  // Bottom info panel animation style
  const bottomSheetTranslateY = bottomSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
    extrapolate: 'clamp',
  });

  // Go to a specific attraction
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

  // Search attractions
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

  // Add functionality to set to Terracotta Army location
  const setToTerracottaArmy = () => {
    setUseSimulatedLocation(true);
    // Automatically zoom to Terracotta Army location
    if (mapRef.current) {
      const region = {
        latitude: TERRACOTTA_ARMY_LOCATION.coords.latitude,
        longitude: TERRACOTTA_ARMY_LOCATION.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(region, 1000);
    }
  };

  // Add custom marker style function
  const getMarkerStyle = (category) => {
    // Based on different categories, return different colors
    const colors = {
      'Historical Site': '#E74C3C', // Red
      'Natural Landscape': '#27AE60', // Green
      'Museum': '#8E44AD', // Purple
      'Temple': '#F39C12', // Orange
      'Landmark': '#3498DB', // Blue
    };
    
    // Default color
    return colors[category] || '#FF5733'; // If no matching category, use orange-red
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar translucent backgroundColor="transparent" />
      
      {/* Map */}
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
            // Click on map to close details
            setSelectedAttraction(null);
          }}
          customMapStyle={mapStyle}
          urlTemplate="https://maps.googleapis.com/maps/vt?pb=!1m5!1m4!1i{z}!2i{x}!3i{y}!4i256!2m3!1e0!2sm!3i{language}!2m21!1e2!2sspotlight!5i1!8m18!1m3!1d4005.77!2d151.20!3d-33.88!3m2!1i1024!2i768!4f13.1!4m2!3e0!4m2!3e2!5m4!1s0x0%3A0x0!2zMzmrMCfDAyIzLjQiUyAxNTHCsDEyJzM2LjIiRQ!4m2!1sd!2sen!13m1!3b1&key={key}"
          language="en"
        >
          {/* Display tourist attraction markers */}
          {attractions.map(attraction => (
            <Marker
              key={attraction.id}
              coordinate={attraction.coordinate}
              title={attraction.title}
              description={attraction.description}
              onPress={() => handleAttractionPress(attraction)}
            >
              {/* New simple marker */}
              <View style={styles.customMarker}>
                <View style={[
                  styles.markerPin,
                  { backgroundColor: getMarkerStyle(attraction.category) }
                ]}>
                  <Icon 
                    name="location" 
                    size={hp(1.8)} 
                    color="white" 
                  />
                </View>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Control buttons */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={goToCurrentLocation}>
            <Icon name="location" size={hp(3)} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.controlButton, useSimulatedLocation && styles.activeControlButton]} 
            onPress={setToTerracottaArmy}
          >
            <Icon name="user" size={hp(3)} color={useSimulatedLocation ? 'white' : theme.colors.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Search bar */}
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

        {/* Attraction info panel */}
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
                
                {/* Additional attraction information */}
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
                    // Jump to task page and pass attraction and task information
                    router.push({
                      pathname: 'task',
                      params: {
                        id: selectedAttraction.id,
                        title: selectedAttraction.title,
                        description: selectedAttraction.description,
                        latitude: selectedAttraction.coordinate.latitude,
                        longitude: selectedAttraction.coordinate.longitude,
                        userLatitude: useSimulatedLocation ? TERRACOTTA_ARMY_LOCATION.coords.latitude : (location ? location.coords.latitude : null),
                        userLongitude: useSimulatedLocation ? TERRACOTTA_ARMY_LOCATION.coords.longitude : (location ? location.coords.longitude : null),
                        isSimulatedLocation: useSimulatedLocation,
                        taskTitle: selectedAttraction.taskTitle,
                        taskDescription: selectedAttraction.taskDescription,
                        taskPoints: selectedAttraction.taskPoints,
                        taskType: selectedAttraction.taskType
                      }
                    });
                  }}
                >
                  <Icon name="plus" size={22} color={theme.colors.primary} />
                  <Text style={styles.actionText}>Task Challenge</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    // Jump to attraction details page
                    router.push({
                      pathname: 'spotDetail',
                      params: {
                        id: selectedAttraction.id
                      }
                    });
                  }}
                >
                  <Icon name="eye" size={22} color={theme.colors.primary} />
                  <Text style={styles.actionText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
    </View>
    
      {/* Bottom navigation bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('home')}>
          <Icon name="home" size={hp(3)} color={theme.colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('search')}>
          <Icon name="search" size={hp(3)} color={theme.colors.text} />
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
  markerPin: {
    width: hp(3),
    height: hp(3),
    borderRadius: hp(1.5),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
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
  activeControlButton: {
    backgroundColor: theme.colors.primary,
  },
})