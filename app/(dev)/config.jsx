import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import ConfigureTools from '../../scripts/configure';

// 开发者配置页面 - 只在开发环境可用

export default function ConfigPage() {
  // 只在开发环境可用
  if (!__DEV__) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>此页面仅在开发环境可用</Text>
      </View>
    );
  }
  
  return <ConfigureTools />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
  },
}); 