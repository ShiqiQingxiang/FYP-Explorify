import { View, Text, Pressable } from 'react-native'
import React from 'react'
import { StyleSheet } from 'react-native'
import { theme } from '../constants/theme' 
import Loading from './Loading'
import { hp } from '../helpers/common'

const Button = ({
  buttonStyle,
  textStyle,
  title='',
  onPress=()=>{},
  loading = false,
  hasShadow = true,
}) => {

  const ShadowStyle = {
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  }

  if(loading){
    return (
      <View style={[styles.button, buttonStyle, {backgroundColor: 'white'}]}>
        <Loading />
      </View>
    )
  }
  return (
    <Pressable onPress={onPress} style={[styles.button, buttonStyle, hasShadow && ShadowStyle]}>
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </Pressable>
  )
}

export default Button

const styles = StyleSheet.create({
  button:{
    backgroundColor: theme.colors.primary,
    height: hp(6.6),
    justifyContent: 'center',
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: theme.radius.xl
  },
  text: {
    color: 'white',
    fontSize: hp(2.2),
    fontWeight: theme.fonts.bold
  }
})