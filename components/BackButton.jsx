import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Pressable } from 'react-native'
import Icon from '../assets/icons'
import { theme } from '../constants/theme'

const BackButton = ({size=26, router}) => {
  return (
    <Pressable onPress={()=> router.back()} style={styles.button}> 
      <Icon name="arrowLeft" strokewidth={2.5} size={size} color={theme.colors.text} />
    </Pressable>
  )
}

export default BackButton

const styles = StyleSheet.create({
    button: {
        padding: 5,
        borderRadius: theme.radius.sm,
        backgroundColor: 'rgba(0,0,0,0.07)',
        alignSelf: 'flex-start',
    }
})