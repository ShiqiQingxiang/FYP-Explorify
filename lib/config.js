// 应用配置管理模块
// 这个模块集中管理所有配置，包括API密钥等敏感信息

import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 默认配置（开发环境）
const defaultConfig = {
  // API配置
  api: {
    gatewayUrl: 'https://72nxywevyi.execute-api.eu-west-1.amazonaws.com/prod/analyze',
    key: 'R8IUxyuY6c1keOGxOeMJR4cK1R6zOFYQa4h5QEZ4', // 实际密钥应通过安全方式存储/获取
  },
  
  // 功能标志
  features: {
    useDevMode: __DEV__, // 仅在开发模式启用
    simulateLocation: __DEV__, // 仅在开发模式启用位置模拟
  }
};

// 尝试从Constants.manifest.extra中获取配置（app.json/extra）
let expoConfig = {};
try {
  expoConfig = Constants.expoConfig?.extra || {};
} catch (e) {
  console.warn('无法读取Expo配置', e);
}

// 合并配置
const config = {
  ...defaultConfig,
  ...expoConfig,
  api: {
    ...defaultConfig.api,
    ...(expoConfig.api || {})
  },
  features: {
    ...defaultConfig.features,
    ...(expoConfig.features || {})
  }
};

// 从安全存储获取敏感配置
export const loadSecureConfig = async () => {
  try {
    const apiKey = await AsyncStorage.getItem('secure_api_key');
    if (apiKey) {
      config.api.key = apiKey;
    }
  } catch (e) {
    console.warn('无法加载安全配置', e);
  }
  
  return config;
};

// 保存安全配置
export const saveApiKey = async (apiKey) => {
  try {
    await AsyncStorage.setItem('secure_api_key', apiKey);
    config.api.key = apiKey;
    return true;
  } catch (e) {
    console.error('保存API密钥失败', e);
    return false;
  }
};

// 获取当前配置
export const getConfig = () => config;

export default config; 