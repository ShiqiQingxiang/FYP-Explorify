import React from 'react'
import {Image, Text, View, StyleSheet, Pressable } from 'react-native'
import Screenwrapper from '../components/ScreenWrapper'
import { StatusBar } from 'expo-status-bar'
import { wp } from '../helpers/common'
import { hp } from '../helpers/common'
import { theme } from '../constants/theme'
import Button from '../components/Button'
import { useRouter } from 'expo-router'  

const Welcome = () => {
    const router = useRouter();  
    return (
      <Screenwrapper bg="white">
        <StatusBar style="dark" />
        <View style={styles.container}>
          {/* welcome image */}
          <Image style={styles.welcomeImage} resizeModel="contain" source={require('../assets/images/welcome.png')} />
          
          {/* title */}
          <View style={{gap: 20}}>
            <Text style={styles.title}>Explorify</Text>
            <Text style={styles.punchline}>
              Let's go on an interesting trip.
            </Text>
          </View>

          {/* footer */}
          <View style={styles.footer}>
            <Button 
              title="Get Started"
              onPress={()=> router.push('Signup')}
              buttonStyle={{marginHorizontal: wp(3)}}
              textStyle={{color: 'white'}}
            />
            <View style={styles.bottomTextContainer}>
              <Text style={styles.loginText}>
                Already have an account!
              </Text>
              <Pressable onPress={()=> router.push('Login')}>
                <Text style={[styles.loginLink, {color: theme.colors.primaryDark, fontWeight: theme.fonts.bold}]}>
                  Login
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Screenwrapper>
    )
  }

export default Welcome

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    paddingHorizontal: wp(6),
  },
  welcomeImage: {
    width: wp(100),
    height:hp(40),
    alignSelf: 'center',
    marginTop: hp(-5),
  },
  title: {
    color: theme.colors.text,
    fontSize: hp(6),
    textAlign: 'center',
    fontWeight: theme.fonts.extraBold,
  },
  punchline: {
    textAlign: 'center',
    paddingHorizontal: wp(10),
    fontSize: hp(1.7),
    color: theme.colors.text,
  },
  footer: {
    width: '100%',
    gap: 30,
  },
  bottomTextContainer: {
    flexDirection: 'row',
    justifyContent: 'right',
    alignItems: 'right',
    gap: 6
  },
  loginText: {
    color: theme.colors.text,
    fontSize: hp(1.6),
    textAlign: 'left'
  }
})