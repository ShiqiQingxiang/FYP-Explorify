import { View, Text } from 'react-native'
import React, { useEffect } from 'react'
import { Stack } from 'expo-router'
import { AuthProvider,useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useRouter } from 'expo-router'
import { getUserData } from '../services/userService'

const _layout = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  )
}

const MainLayout = () => {
  const {setAuth, setUserData} = useAuth();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      // console.log('session user', session?.user?.id)

      if(session){
        setAuth(session?.user);
        updateUserData(session?.user, session?.user?.email);
        router.replace('/home');
      }else{
        setAuth(null);
        router.replace('/welcome');
      }
    })
  },[])

  const updateUserData = async (user, email) => {
    let  res = await getUserData(user?.id);
    if(res.success) setUserData({...res.data, email});
  }
  return (
    <Stack
        screenOptions={{
            headerShown: false
        }}
    >
      {/* 其他现有路由在此 */}
      
      {/* 管理员路由 */}
      <Stack.Screen
        name="(admin)/verifications"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  )
}

export default _layout