import React from 'react'
import { Alert, Text, View, StyleSheet, TextInput, Pressable } from 'react-native'
import Screenwrapper from '../components/ScreenWrapper'
import { theme } from '../constants/theme'
import Icon from '../assets/icons'
import { StatusBar } from 'expo-status-bar'
import BackButton from '../components/BackButton'
import Button from '../components/Button'
import { useRouter } from 'expo-router'
import { wp, hp } from '../helpers/common'
import { useRef, useState } from 'react'
import Input from '../components/Input'
import { supabase } from '../lib/supabase'

const Signup = () => {
    const router = useRouter();
    const emailRef = useRef("");
    const nameRef = useRef("");
    const passwordRef = useRef("");
    const [loading, setLoading] = useState(false);

    const onSumbit = async () => {
      if(!emailRef.current || !passwordRef.current){
        Alert.alert('Sign up', "please fill all the fields!");
        return;
      }
    
      let name = nameRef.current.trim();
      let email = emailRef.current.trim();
      let password = passwordRef.current.trim();

      setLoading(true);

      const {data: {session}, error} = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            name 
          },
        },
      });
      setLoading(false);

      console.log('session: ', session);
      console.log('error: ', error);
      if(error){
        Alert.alert('Sign up', error.message);
      } 
  }

    return (
      <Screenwrapper bg="white">
        <StatusBar style="dark" />
        <View style={styles.container}>
          <BackButton router={router} />

          <View>
            <Text style={styles.welcomeText}>Sign up</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={{fontsize: hp(1.5),color: theme.colors.text}}>
              Please login to continue
            </Text>
            <Input
              icon={<Icon name="user" size={26} strokeWidth={1.6} />}
              placeholder='Enter your name'
              onChangeText={value=> nameRef.current = value}
            />
            <Input
              icon={<Icon name="mail" size={26} strokeWidth={1.6} />}
              placeholder='Enter your email'
              onChangeText={value=> emailRef.current = value}
            />
            <Input
              icon={<Icon name="lock" size={26} strokeWidth={1.6}/>}
              placeholder="Enter your password"
              secureTextEntry
              onChangeText={value=> passwordRef.current = value}
            />
            <Text style={styles.forgotPassword}>Forgot password?</Text>
            {/* Button */}
            <Button title={'Sign up'} loading={loading} onPress={onSumbit} />

          </View>
          
          {/* Footer */} 
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account!</Text>
            <Pressable>
              <Text style={[styles.footerText, {color: theme.colors.primary, fontWeight: theme.fonts.semibold}]}>Login</Text>
            </Pressable>
          </View>
        </View>
      </Screenwrapper>
    )
  }

export default Signup

const styles = StyleSheet.create({
  container:{
    flex: 1,
    gap: 45,
    paddingHorizontal: wp(4),
  },
  welcomeText:{
    fontsize: hp(4),
    fontWeight: theme.fonts.extraBold,
    color: theme.colors.text,
    textAlign: 'center'
  },
  form:{
    gap: 25,
  },
  forgotPassword:{
    textAlign: 'right',
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text
  },
  footer:{
    flexDirection:'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap:5,
  },
  footerText:{
    textAlign: 'center',
    color: theme.colors.text,
    fontsize: hp(1.6)
  }
  })