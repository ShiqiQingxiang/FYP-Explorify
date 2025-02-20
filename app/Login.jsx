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

const Login = () => {
    const router = useRouter();
    const emailRef = useRef("");
    const passwordRef = useRef("");
    const [loading, setLoading] = useState(false);

    const onSumbit = async () => {
      if(!emailRef.current || !passwordRef.current){
        Alert.alert('Login', "please fill all the fields!");
        return;
    }

    let email = emailRef.current.trim();
    let password = passwordRef.current.trim();
    setLoading(true);
    const {error} = await supabase.auth.signInWithPassword({ 
      email, 
      password
    });

    setLoading(false);

    console.log('error: ', error);
    if(error){
      Alert.alert('Login', error.message);
    }

  }

    return (
      <Screenwrapper bg="white">
        <StatusBar style="dark" />
        <View style={styles.container}>
          <BackButton router={router} />

          <View>
            <Text style={styles.welcomeText}>Welcome</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={{fontsize: hp(1.5),color: theme.colors.text}}>
              Please login to continue
            </Text>
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
            <Button title={'Login'} loading={loading} onPress={onSumbit} />

          </View>
          
          {/* Footer */} 
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Pressable>
              <Text style={[styles.footerText, {color: theme.colors.primary, fontWeight: theme.fonts.semibold}]}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </Screenwrapper>
    )
  }

export default Login

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