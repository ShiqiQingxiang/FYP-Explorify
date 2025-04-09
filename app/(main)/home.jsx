import { Alert, Button, Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { hp, wp } from '../../helpers/common'
import { theme } from '../../constants/theme'
import Icon from '../../assets/icons'
import { useRouter } from 'expo-router'
import Avatar from '../../components/Avatar'

const Home = () => {

  const {user, setAuth} = useAuth();
  const router = useRouter();

  // console.log('user: ', user);

  // const onLogout = async () => {
  //   // setAuth(null);
  //   const { error } = await supabase.auth.signOut();
  //   if(error) {
  //     Alert.alert('Sign out', "Error signing out!")
  //   }
  // }
  return (
    <ScreenWrapper bg="white">
      <View style={styles.container}>
        {/* Header */}  
        <View style={styles.header}>
          <Text style={styles.title}>Explorify</Text>
          <View style={styles.icons}>
            <Pressable onPress={() => router.push('map')}>
              <Icon name="home" size={hp(3.2)} strokeWidth={2} color={theme.colors.text}/>
            </Pressable>
            <Pressable onPress={() => router.push('notifications')}>
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
        
        {/* 这里放置主要内容 */}
        <View style={{flex: 1}}>
          {/* 主页内容放在这里 */}
        </View>
        
        {/* 底部导航栏 */}
        <View style={styles.bottomNav}>
          <Pressable style={styles.navItem} onPress={() => router.push('home')}>
            <Icon name="home" size={hp(3)} color={theme.colors.primary} />
          </Pressable>
          
          <Pressable style={styles.navItem} onPress={() => router.push('search')}>
            <Icon name="search" size={hp(3)} color={theme.colors.text} />
          </Pressable>
          
          <Pressable style={styles.navItem} onPress={() => router.push('map')}>
            <View style={styles.addButton}>
              <Icon name="plus" size={hp(3)} color="white" />
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
      {/* <Button title="logout" onPress={onLogout} /> */}
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