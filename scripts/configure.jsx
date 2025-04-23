import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config, { saveApiKey } from '../lib/config';

// 开发者配置工具 - 用于设置API密钥等开发时配置
// 使用方法: 在开发模式下，可通过特定路由访问此页面

const ConfigureTools = () => {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  
  // 加载已保存的配置
  useEffect(() => {
    const loadSavedConfig = async () => {
      try {
        const key = await AsyncStorage.getItem('secure_api_key');
        if (key) {
          setSavedKey(key);
          setApiKey(key);
        }
      } catch (e) {
        console.error('无法加载保存的配置', e);
      }
    };
    
    loadSavedConfig();
  }, []);
  
  // 保存API密钥
  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('错误', 'API密钥不能为空');
      return;
    }
    
    const success = await saveApiKey(apiKey.trim());
    if (success) {
      setSavedKey(apiKey.trim());
      Alert.alert('成功', 'API密钥已保存');
    } else {
      Alert.alert('错误', '无法保存API密钥');
    }
  };
  
  // 清除API密钥
  const handleClearApiKey = async () => {
    try {
      await AsyncStorage.removeItem('secure_api_key');
      setApiKey('');
      setSavedKey('');
      Alert.alert('成功', 'API密钥已清除');
    } catch (e) {
      console.error('清除API密钥失败', e);
      Alert.alert('错误', '无法清除API密钥');
    }
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.container}>
        <Text style={styles.title}>开发者配置工具</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API配置</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>API Gateway URL:</Text>
            <Text style={styles.value}>{config.api.gatewayUrl}</Text>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>当前API密钥:</Text>
            <Text style={styles.value}>
              {savedKey ? `${savedKey.substring(0, 4)}...${savedKey.substring(savedKey.length - 4)}` : '未设置'}
            </Text>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>设置新API密钥:</Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="输入API密钥"
              secureTextEntry={true}
            />
          </View>
          
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.button} onPress={handleSaveApiKey}>
              <Text style={styles.buttonText}>保存API密钥</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.dangerButton]} 
              onPress={handleClearApiKey}
            >
              <Text style={styles.buttonText}>清除API密钥</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.developmentNote}>
          <Text style={styles.noteText}>
            注意: 此工具仅用于开发环境。在生产环境中，API密钥应通过安全方式提供，
            例如通过CI/CD流程注入环境变量。
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    padding: 10,
    backgroundColor: '#e8e8e8',
    borderRadius: 5,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  developmentNote: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#ffeeba',
  },
  noteText: {
    color: '#856404',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ConfigureTools; 