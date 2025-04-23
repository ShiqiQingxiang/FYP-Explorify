import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, StatusBar, Alert, SafeAreaView, ActivityIndicator } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { theme } from '../../constants/theme'
import { hp, wp } from '../../helpers/common'
import Icon from '../../assets/icons'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'
import Header from '../../components/Header'
import { supabase } from '../../lib/supabase'
import config, { loadSecureConfig } from '../../lib/config'
import AsyncStorage from '@react-native-async-storage/async-storage'

const Task = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [image, setImage] = useState(null);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [isNearAttraction, setIsNearAttraction] = useState(false);
  const [distance, setDistance] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [user, setUser] = useState(null);

  // Load configuration
  useEffect(() => {
    const loadConfig = async () => {
      await loadSecureConfig();
      setConfigLoaded(true);
    };
    
    loadConfig();
  }, []);

  // Get user information
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          console.log('User information retrieved:', data.user.id);
          setUser(data.user);
        } else {
          console.log('Failed to get user information');
        }
      } catch (error) {
        console.error('Failed to get user information:', error);
      }
    };
    
    getUser();
  }, []);

  // Get tourist spot and task information from parameters
  const attraction = {
    id: params.id,
    title: params.title || 'Tourist Attraction',
    description: params.description || 'Complete a challenge at this attraction',
    // Add spot coordinate information from route parameters
    latitude: params.latitude ? parseFloat(params.latitude) : null,
    longitude: params.longitude ? parseFloat(params.longitude) : null,
  };

  // Get current user location information from parameters (real or simulated)
  const userLocation = {
    latitude: params.userLatitude ? parseFloat(params.userLatitude) : null,
    longitude: params.userLongitude ? parseFloat(params.userLongitude) : null,
    isSimulated: params.isSimulatedLocation === 'true'
  };

  // Get task information from parameters, use default values if not available
  const taskDetails = {
    title: params.taskTitle || 'Photo Challenge',
    description: params.taskDescription || 'Take a photo that showcases this attraction',
    points: params.taskPoints ? parseInt(params.taskPoints) : 10,
    difficulty: params.taskPoints ? (parseInt(params.taskPoints) > 20 ? 'Hard' : 'Medium') : 'Easy',
    type: params.taskType || 'photo'
  };

  // Load user task status (completed or under review)
  useEffect(() => {
    const checkTaskStatus = async () => {
      try {
        if (!attraction.id) return;
        
        console.log('开始检查任务ID:', attraction.id, '的状态');
        
        // 获取用户ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('未找到用户信息，无法检查任务状态');
          return;
        }
        
        console.log('检查用户ID:', user.id, '的任务状态');
        console.log('仅从user_tasks表获取任务状态，不使用缓存');
        
        // 从user_tasks表获取任务状态
        const { data: userTasks, error: userTasksError } = await supabase
          .from('user_tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('task_id', attraction.id)
          .order('created_at', { ascending: false });
          
        if (userTasksError) {
          console.error('获取任务状态失败:', userTasksError);
          return;
        }
        
        console.log('找到的任务数量:', userTasks?.length || 0);
        
        // 如果没有任务记录，说明任务尚未开始
        if (!userTasks || userTasks.length === 0) {
          console.log('未找到任务记录，用户可以提交任务');
          setTaskCompleted(false);
          setVerificationResult(null);
          return;
        }
        
        // 使用最新的任务记录
        const latestTask = userTasks[0];
        console.log('最新任务记录:', latestTask);
        
        // 检查任务是否已完成
        if (latestTask.verified === true || latestTask.completed === true) {
          console.log('任务已完成');
          setTaskCompleted(true);
          setVerificationResult({
            isCompleted: true,
            isPending: false,
            message: 'You have already completed this task and cannot submit again',
            points: latestTask.points_earned || taskDetails.points
          });
          return;
        }
        
        // 检查任务是否待审核
        if (latestTask.verification_status === 'manual_pending') {
          console.log('任务正在等待审核');
          if (latestTask.image_url) {
            setImage(latestTask.image_url);
          }
          
          setVerificationResult({
            isCompleted: false,
            isPending: true,
            message: 'Automatic recognition unsuccessful, submitted for manual review. Please wait.'
          });
          return;
        }
        
        // 检查任务是否被拒绝
        if (latestTask.verification_status === 'manual_rejected') {
          console.log('任务被拒绝');
          setVerificationResult({
            isCompleted: false,
            isPending: false,
            isRejected: true,
            message: 'Your submission was not approved. You can submit again.',
            temporary: true // 标记为临时状态
          });
          return;
        }
        
        // 默认状态：任务可以提交
        console.log('任务处于可提交状态');
        setTaskCompleted(false);
        setVerificationResult(null);
        
      } catch (err) {
        console.error('加载任务状态时出错:', err);
      }
    };
    
    // 清理任务界面状态
    const clearTaskState = () => {
      setImage(null);
      setTaskCompleted(false);
      setVerificationResult(null);
    };
    
    // 添加强制状态设置函数 (仅用于开发测试)
    const forceSetStatus = async () => {
      const statusParam = params.status;
      
      if (statusParam === 'completed') {
        console.log('Forcing completed status via URL parameter');
        setTaskCompleted(true);
        setVerificationResult({
          isCompleted: true,
          isPending: false,
          message: 'You have already completed this task and cannot submit again',
          points: taskDetails.points
        });
        return true;
      } 
      else if (statusParam === 'pending') {
        console.log('Forcing pending review status via URL parameter');
        setVerificationResult({
          isCompleted: false,
          isPending: true,
          message: 'Your photo has been submitted for manual review. Points will be awarded upon approval.'
        });
        return true;
      }
      else if (statusParam === 'rejected') {
        console.log('Forcing rejected status via URL parameter');
        setVerificationResult({
          isCompleted: false,
          isPending: false,
          isRejected: true,
          message: 'Your submission was not approved. You can submit again.',
          temporary: true
        });
        return true;
      }
      
      return false;
    };
    
    // 初始化任务状态
    const initializeStatus = async () => {
      // 清除所有状态
      clearTaskState();
      
      // 检查是否有开发参数
      const forcedStatus = await forceSetStatus();
      if (forcedStatus) return;
      
      // 强制刷新
      if (params.forceRefresh === 'true') {
        console.log('强制刷新状态');
        checkTaskStatus();
        return;
      }
      
      // 从数据库获取状态
      await checkTaskStatus();
    };
    
    // 启动初始化
    initializeStatus();
    
    // 设置定期刷新，每30秒检查一次状态
    const statusRefreshInterval = setInterval(() => {
      console.log('定期检查任务状态...');
      checkTaskStatus().catch(e => console.error('定期状态更新失败:', e));
    }, 30000); // 30秒刷新一次
    
    // 页面销毁时清除定时器
    return () => {
      clearInterval(statusRefreshInterval);
    };
  }, [attraction.id, params.status, params.forceRefresh, taskDetails.points]);

  // 计算两个坐标之间的距离（单位：公里）
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    
    const R = 6371; // 地球半径，单位为公里
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // 距离，单位为公里
    
    return distance;
  };

  // 计算与景点的距离并检查是否在范围内
  useEffect(() => {
    const checkLocationProximity = async () => {
      try {
        setLocationLoading(true);
        
        // 使用传入的位置信息（真实或模拟）
        if (userLocation.latitude && userLocation.longitude && attraction.latitude && attraction.longitude) {
          // 计算用户与景点之间的距离
          const calculatedDistance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            attraction.latitude,
            attraction.longitude
          );
          
          setDistance(calculatedDistance);
          
          // 如果距离小于5公里，则允许拍照
          const isNear = calculatedDistance <= 5;
          setIsNearAttraction(isNear);
          
          if (!isNear) {
            Alert.alert(
              'Too Far from Attraction',
              `You are ${calculatedDistance.toFixed(1)} km away from this attraction. You need to be within 5 km to complete this task.`
            );
          }
        } else {
          // 如果没有位置信息，显示错误
          Alert.alert(
            'Location Unavailable',
            'Could not determine your location or attraction coordinates.'
          );
        }
      } catch (error) {
        console.error("Error processing location:", error);
        Alert.alert('Error', 'Could not determine location proximity');
      } finally {
        setLocationLoading(false);
      }
    };

    checkLocationProximity();
  }, []);

  // 拍照功能
  const takePhoto = async () => {
    // 检查是否在景点附近
    if (!isNearAttraction && attraction.latitude !== null && attraction.longitude !== null) {
      Alert.alert(
        'Too Far from Attraction',
        `You are ${distance.toFixed(1)} km away from this attraction. You need to be within 5 km to complete this task.`
      );
      return;
    }
    
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Camera Permission Required', 'Please allow the app to access your camera in settings');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      // 清除之前的验证结果
      setVerificationResult(null);
    }
  };

  // 从相册选择照片
  const pickImage = async () => {
    // 检查是否在景点附近
    if (!isNearAttraction && attraction.latitude !== null && attraction.longitude !== null) {
      Alert.alert(
        'Too Far from Attraction',
        `You are ${distance.toFixed(1)} km away from this attraction. You need to be within 5 km to complete this task.`
      );
      return;
    }
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Gallery Permission Required', 'Please allow the app to access your photo gallery in settings');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      // 清除之前的验证结果
      setVerificationResult(null);
    }
  };

  // Submit task for verification
  const submitTaskForVerification = async (taskId, imageUri, modelName) => {
    try {
      setIsLoading(true);
      setSubmitting(true);
      
      // Ensure configuration is loaded
      if (!configLoaded) {
        await loadSecureConfig();
      }
      
      // Read image file as base64
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Get API information from configuration
      const apiUrl = config.api.gatewayUrl;
      const apiKey = config.api.key;
      
      // Debug log - Check API configuration
      console.log('=== API Configuration Debug Info ===');
      console.log('API URL:', apiUrl);
      console.log('API key exists:', apiKey ? 'Yes' : 'No');
      if (apiKey) {
        console.log('First 4 chars of API key:', apiKey.substring(0, 4));
      }
      
      // If there is no API key, display error
      if (!apiKey) {
        console.error('缺少API密钥，无法验证任务');
        Alert.alert(
          'API配置错误',
          '系统未配置API密钥，请联系管理员',
          [{ text: '确定', style: 'default' }]
        );
        return false;
      }
      
      // Prepare request data
      const requestData = {
        imageBase64: `data:image/jpeg;base64,${base64Image}`,
        modelName: modelName || 'Terracotta-Warriors' // Default model name
      };
      
      console.log('正在提交图像进行分析...');
      console.log('请求URL:', apiUrl);
      console.log('请求模型名称:', requestData.modelName);
      console.log('图像大小(bytes):', base64Image.length);
      
      // Try different resource paths - Test 3 possible URL formats
      let response = null;
      let success = false;
      const possiblePaths = [
        '', // Original path
        '/analyze', // Try adding /analyze resource path
        '/image' // Try adding /image resource path
      ];
      
      // Try different authentication header names
      const possibleAuthHeaders = [
        { 'x-api-key': apiKey },
        { 'X-Api-Key': apiKey },
        { 'Authorization': `Bearer ${apiKey}` },
        { 'api-key': apiKey }
      ];
      
      console.log('尝试多种请求格式...');
      
      // First try different paths
      for (const path of possiblePaths) {
        const currentUrl = `${apiUrl}${path}`;
        console.log(`尝试请求URL: ${currentUrl}`);
        
        // Then try different authentication headers
        for (const authHeader of possibleAuthHeaders) {
          // Merge authentication header with content type header
          const currentHeaders = {
            'Content-Type': 'application/json',
            ...authHeader
          };
          
          // Record the current used authentication header type (hide full key)
          const authHeaderType = Object.keys(authHeader)[0];
          console.log(`- 使用认证头: ${authHeaderType}`);
          
          try {
            // Send request to API Gateway
            response = await fetch(currentUrl, {
              method: 'POST',
              headers: currentHeaders,
              body: JSON.stringify(requestData),
            });
            
            console.log(`  路径 ${path || '(无)'} + ${authHeaderType} 响应状态:`, response.status);
            
            if (response.status !== 403) {
              console.log(`找到有效组合: 路径=${path || '(无)'}, 认证头=${authHeaderType}`);
              success = true;
              break;
            }
          } catch (e) {
            console.error(`请求失败 - 路径: ${path}, 认证头: ${authHeaderType}, 错误:`, e.message);
          }
        }
        
        if (success) break; // If successful combination found, exit outer loop
      }
      
      // If all attempts fail, switch to manual review
      if (!success && !response) {
        console.log('所有API请求格式都失败，转为人工审核');
        return submitForManualVerification(taskId, imageUri, modelName);
      }
      
      // Record response status and header information
      console.log('API响应状态:', response.status);
      console.log('API响应状态文本:', response.statusText);
      
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log('API响应头:', JSON.stringify(responseHeaders));
      
      if (!response.ok) {
        // Try to read error response
        let errorBody = '';
        try {
          errorBody = await response.text();
          console.error('API错误响应内容:', errorBody);
        } catch (e) {
          console.error('无法读取错误响应内容:', e);
        }
        
        // If API call fails, switch to manual review
        console.log('API请求失败，转为人工审核');
        return submitForManualVerification(taskId, imageUri, modelName);
      }
      
      const result = await response.json();
      console.log('Analysis result:', result);
      
      if (result.success) {
        // Recognition successful, call task completion API
        const completeResponse = await supabase
          .from('user_tasks')
          .update({ 
            status: 'completed', 
            verified: true,
            verification_status: 'auto_approved',
            points_earned: taskDetails.points 
          })
          .eq('id', taskId);
        
        if (completeResponse.error) {
          throw new Error(`Failed to update task status: ${completeResponse.error.message}`);
        }
        
        setTaskCompleted(true);
        setVerificationResult({
          isCompleted: true,
          confidence: result.confidence || 95,
          matchedLabels: result.matchedLabels || []
        });
        
        Alert.alert('Success', `Task verification passed! Confidence: ${result.confidence ? result.confidence.toFixed(2) : '95'}%`);
        return true;
      } else {
        // Recognition failed, switch to manual review
        return submitForManualVerification(taskId, imageUri, modelName);
      }
    } catch (error) {
      console.error('任务验证错误:', error);
      
      // Even if there's an error, switch to manual review
      try {
        return submitForManualVerification(attraction.id, imageUri, modelName);
      } catch (manualError) {
        console.error('转为人工审核时出错:', manualError);
        Alert.alert('Error', `验证过程中出错: ${error.message}`);
        return false;
      }
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  // Submit manual review
  const submitForManualVerification = async (taskId, imageUri, modelName) => {
    try {
      console.log('开始人工审核流程...');
      
      // 无论之前状态如何，清除临时拒绝状态
      if (verificationResult?.isRejected) {
        console.log('清除之前的拒绝状态');
        setVerificationResult(null);
      }
      
      // 验证数据库表是否存在
      console.log('验证数据库表结构...');
      const { data: tablesData, error: tablesError } = await supabase
        .from('manual_verifications')
        .select('*')
        .limit(1);
        
      if (tablesError) {
        console.error('数据库表验证失败:', tablesError);
        Alert.alert('Error', 'Database structure error: ' + tablesError.message);
        return false;
      } else {
        console.log('manual_verifications表验证成功');
      }
      
      // Get user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.id) {
        throw new Error('Not logged in or unable to get user ID');
      }
      
      const userId = currentUser.id;
      console.log('用户ID:', userId, '任务ID:', taskId);
      
      try {
        // Convert image to base64, not blob (to avoid blob processing issues)
        const base64Image = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Upload image to supabase storage
        const timestamp = new Date().getTime();
        const filePath = `verifications/${timestamp}_task_${taskId}.jpg`;
        
        console.log('Uploading image to storage:', filePath);
        
        // Convert base64 to ArrayBuffer (more reliable)
        const arrayBuffer = decode(base64Image);
        
        let uploadAttempts = 0;
        const maxAttempts = 3;
        let fileData, fileError;
        
        // Add retry logic
        while (uploadAttempts < maxAttempts) {
          uploadAttempts++;
          console.log(`Upload attempt (${uploadAttempts}/${maxAttempts})...`);
          
          try {
            const uploadResult = await supabase.storage
              .from('uploads')  // Use the public uploads bucket
              .upload(filePath, arrayBuffer, {
                contentType: 'image/jpeg',
                upsert: true // If exists, overwrite
              });
              
            fileData = uploadResult.data;
            fileError = uploadResult.error;
            
            if (!fileError) break; // Upload successful, exit loop
            
            console.error(`Upload attempt ${uploadAttempts} failed:`, fileError);
            if (uploadAttempts < maxAttempts) {
              // Wait one second before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (e) {
            console.error(`上传尝试 ${uploadAttempts} 出错:`, e);
            if (uploadAttempts >= maxAttempts) fileError = e;
          }
        }
        
        if (fileError) {
          console.error('Image upload still failed after multiple attempts:', fileError);
          throw new Error(`Image upload failed: ${fileError.message || 'Network error'}`);
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('uploads')  // Use the public uploads bucket
          .getPublicUrl(filePath);
        
        console.log('Image uploaded successfully, URL:', publicUrl);
        
        // Create or update user task
        let userTaskId = null;
        
        // Check if task exists
        const { data: existingTasks, error: checkError } = await supabase
          .from('user_tasks')
          .select('id')
          .eq('user_id', userId)
          .eq('task_id', taskId)
          .maybeSingle();
        
        if (checkError) {
          console.error('检查任务是否存在时出错:', checkError);
        }
        
        if (existingTasks && existingTasks.id) {
          // Update existing task
          userTaskId = existingTasks.id;
          console.log('更新现有任务:', userTaskId);
          
          const { error: updateError } = await supabase
            .from('user_tasks')
            .update({ 
              verification_status: 'manual_pending',
              image_url: publicUrl 
            })
            .eq('id', userTaskId);
            
          if (updateError) {
            console.error('更新任务状态失败:', updateError);
            throw new Error('更新任务状态失败');
          }
        } else {
          // Create new task
          console.log('创建新任务');
          const { data: newTask, error: createError } = await supabase
            .from('user_tasks')
            .insert({
              user_id: userId,
              task_id: taskId,
              verification_status: 'manual_pending',
              image_url: publicUrl
            })
            .select('id')
            .single();
            
          if (createError) {
            console.error('创建任务记录失败:', createError);
            throw new Error('创建任务记录失败');
          }
          
          userTaskId = newTask.id;
        }
        
        // Check if there is existing verification record
        console.log('检查是否已有审核记录');
        const { data: existingVerification, error: checkVerificationError } = await supabase
          .from('manual_verifications')
          .select('id')
          .eq('user_task_id', userTaskId)
          .maybeSingle();
          
        if (checkVerificationError) {
          console.error('检查审核记录时出错:', checkVerificationError);
          throw new Error('检查审核记录时出错');
        }
        
        if (existingVerification && existingVerification.id) {
          // Update existing verification record
          console.log('更新现有审核记录:', existingVerification.id);
          const { error: updateVerificationError } = await supabase
            .from('manual_verifications')
            .update({
              image_url: publicUrl,
              status: 'pending',
              submitted_at: new Date().toISOString() // Update submission time
            })
            .eq('id', existingVerification.id);
            
          if (updateVerificationError) {
            console.error('更新审核记录失败:', updateVerificationError);
            throw new Error('更新审核记录失败');
          }
        } else {
          // Create new verification record
          console.log('创建新的审核记录');
          const { data: verificationData, error: verificationError } = await supabase
            .from('manual_verifications')
            .insert({
              user_task_id: userTaskId,
              user_id: userId,
              spot_id: taskId,
              image_url: publicUrl,
              status: 'pending',
              submitted_at: new Date().toISOString()  // 添加提交时间字段
            })
            .select('*')
            .single();

            if (verificationError) {
              console.error('Failed to create verification record:', verificationError);
              console.error('Error details:', JSON.stringify(verificationError, null, 2));
              console.error('Attempted data:', JSON.stringify({
                user_task_id: userTaskId,
                user_id: userId,
                spot_id: taskId,
                status: 'pending'
              }, null, 2));
              throw new Error(`Failed to create verification record: ${verificationError.message}`);
            } else {
              console.log('审核记录创建成功:', verificationData);
            }
        }
        
        // Set result status
        setVerificationResult({
          isCompleted: false,
          isPending: true,
          message: 'Automatic recognition unsuccessful, submitted for manual review. Please wait.'
        });
        
        Alert.alert(
          'Submitted for Review', 
          'Your photo will be reviewed by an administrator. You will be notified of the result.'
        );
        
        return true;
      } catch (uploadError) {
        // Special handling for upload error
        console.error('图片上传处理过程中出错:', uploadError);
        throw new Error(`提交图片时出错: ${uploadError.message}`);
      }
    } catch (error) {
      console.error('Manual verification submission failed:', error);
      Alert.alert('Error', `Submission failed: ${error.message}`);
      return false;
    }
  };

  // Mock data processor - Use when API is unavailable
  const useMockDataForTesting = async (taskId, imageUri, modelName) => {
    try {
      console.log('====== 使用模拟数据 ======');
      
      // Display mock data prompt
      Alert.alert(
        '开发模式',
        'API无法访问，正在使用模拟数据进行测试',
        [{ text: '确定', style: 'default' }]
      );
      
      // Create mock response data
      const mockResult = {
        success: true,
        isCompleted: true,
        confidence: 92.5,
        matchedLabels: ["terracotta", "warrior", "statue", "china"],
        testMode: true
      };
      
      console.log('模拟分析结果:', mockResult);
      
      // Update task status
      try {
        const completeResponse = await supabase
          .from('tasks')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', taskId);
        
        if (completeResponse.error) {
          console.error('模拟模式: 更新任务状态失败:', completeResponse.error);
        }
      } catch (e) {
        console.error('模拟模式: 更新任务状态异常:', e);
      }
      
      // Set verification result
      setVerificationResult({
        isCompleted: true,
        confidence: mockResult.confidence,
        matchedLabels: mockResult.matchedLabels
      });
      
      Alert.alert('Success', `Task verification passed! Confidence: ${mockResult.confidence.toFixed(2)}%`);
      return true;
    } catch (error) {
      console.error('模拟数据处理错误:', error);
      Alert.alert('Error', `模拟处理过程中出错: ${error.message}`);
      return false;
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  // Render task details
  const renderTaskDetails = () => (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{taskDetails.title}</Text>
        <View style={styles.taskBadge}>
          <Text style={styles.taskBadgeText}>{taskDetails.difficulty}</Text>
        </View>
      </View>
      
      <Text style={styles.taskDescription}>{taskDetails.description}</Text>
      
      {/* Display location information */}
      {distance !== null && (
        <View style={[styles.locationStatus, !isNearAttraction && styles.locationError]}>
          <Icon name="location" size={20} color={isNearAttraction ? theme.colors.primary : 'red'} />
          <Text style={[styles.locationText, !isNearAttraction && styles.locationErrorText]}>
            {userLocation.isSimulated ? "[Simulated] " : ""}
            {isNearAttraction
              ? `You are ${distance.toFixed(1)} km away (within range)`
              : `You are ${distance.toFixed(1)} km away (must be within 5 km)`}
          </Text>
        </View>
      )}
      
      {locationLoading && (
        <View style={styles.locationStatus}>
          <Text style={styles.loadingText}>Checking your location...</Text>
        </View>
      )}
    </View>
  );

  // Render verification result
  const renderVerificationResult = () => {
    if (!verificationResult) return null;
    
    // Manual review status
    if (verificationResult.isPending) {
      return (
        <View style={[styles.verificationCard, styles.pendingCard]}>
          <View style={styles.verificationHeader}>
            <Icon name="clock" size={30} color={theme.colors.warning} />
            <Text style={styles.verificationTitle}>Under Review</Text>
          </View>
          
          <Text style={styles.pendingText}>
            Your photo has been submitted for manual review. Points will be awarded upon approval.
          </Text>
          
          <View style={styles.pendingInfo}>
            <Text style={styles.pendingInfoText}>
              • Review usually completes within 24 hours
            </Text>
            <Text style={styles.pendingInfoText}>
              • You will be notified of the review result
            </Text>
            <Text style={styles.pendingInfoText}>
              • You can check review status on your profile page
            </Text>
          </View>
          
          <View style={styles.pendingTip}>
            <Icon name="arrowLeft" size={16} color={theme.colors.primary} />
            <Text style={styles.pendingTipText}>
              You can return to the home page to explore other attractions
            </Text>
          </View>
        </View>
      );
    }
    
    // Task completed status - Detected when task completed
    if (taskCompleted && verificationResult.message) {
      return (
        <View style={[styles.verificationCard, styles.completedCard]}>
          <View style={styles.verificationHeader}>
            <Icon name="award" size={30} color={theme.colors.success} />
            <Text style={styles.verificationTitle}>Task Completed</Text>
          </View>
          
          <Text style={styles.completedMessage}>
            {verificationResult.message}
          </Text>
          
          <View style={styles.completedDetails}>
            <Text style={styles.completedHint}>You have received the reward for this task. You can explore other attractions.</Text>
          </View>
        </View>
      );
    }
    
    // Task rejected status
    if (verificationResult.isRejected) {
      return (
        <View style={[styles.verificationCard, styles.rejectedCard]}>
          <View style={styles.verificationHeader}>
            <Icon name="delete" size={30} color={theme.colors.error} />
            <Text style={styles.verificationTitle}>审核未通过</Text>
            
            {/* 添加关闭按钮 */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setVerificationResult(null)}
            >
              <Icon name="close" size={24} color={theme.colors.textLight} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.rejectedMessage}>
            {verificationResult.message || '您的照片未通过审核，请重新提交符合要求的照片'}
          </Text>
          
          <View style={styles.rejectedInfo}>
            <Text style={styles.rejectedInfoText}>Possible reasons:</Text>
            <Text style={styles.rejectedInfoItem}>• Photo is unclear or unrecognizable</Text>
            <Text style={styles.rejectedInfoItem}>• Photo content does not match task requirements</Text>
            <Text style={styles.rejectedInfoItem}>• Photo may contain inappropriate content</Text>
          </View>
          
          <View style={styles.rejectedTip}>
            <Icon name="camera" size={16} color={theme.colors.primary} />
            <Text style={styles.rejectedTipText}>
              You can take a new photo and submit again
            </Text>
          </View>
        </View>
      );
    }
    
    // Original success/failure status display
    return (
      <View style={[
        styles.verificationCard,
        verificationResult.isCompleted ? styles.successCard : styles.failureCard
      ]}>
        <Text style={styles.verificationTitle}>
          {verificationResult.isCompleted ? 'Verification Successful' : 'Verification Failed'}
        </Text>
        
        {verificationResult.isCompleted && (
          <Text style={styles.confidenceText}>
            Confidence: {verificationResult.confidence?.toFixed(1) || '100'}%
          </Text>
        )}
        
        {verificationResult.matchedLabels && verificationResult.matchedLabels.length > 0 && (
          <View style={styles.labelsContainer}>
            <Text style={styles.labelsTitle}>Detected Elements:</Text>
            {verificationResult.matchedLabels.map((label, index) => (
              <Text key={index} style={styles.labelItem}>• {label}</Text>
            ))}
          </View>
        )}
        
        {!verificationResult.isCompleted && (
          <Text style={styles.helpText}>
            Try taking a photo that clearly shows the required elements of this attraction
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.container}>
        <Header title={attraction.title} />
        
        <ScrollView style={styles.content}>
          {renderTaskDetails()}
          
          {/* Photo preview area */}
          <View style={styles.photoContainer}>
            {image ? (
              <Image source={{ uri: image }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Icon name="camera" size={50} color={theme.colors.gray} />
                <Text style={styles.photoPlaceholderText}>No photo selected</Text>
              </View>
            )}
          </View>
          
          {/* Verification result area */}
          {renderVerificationResult()}
          
          {/* Take photo/select photo buttons */}
          <View style={styles.photoButtons}>
            <TouchableOpacity 
              style={[
                styles.photoButton, 
                styles.cameraButton,
                (!isNearAttraction && attraction.latitude !== null && attraction.longitude !== null) ? styles.disabledButton : null,
                submitting && styles.disabledButton,
                taskCompleted && styles.disabledButton,
                verificationResult?.isPending && styles.disabledButton
              ]}
              onPress={takePhoto}
              disabled={taskCompleted || (!isNearAttraction && attraction.latitude !== null && attraction.longitude !== null) || submitting || verificationResult?.isPending}
            >
              <Icon name="camera" size={24} color="white" />
              <Text style={styles.photoButtonText}>Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.photoButton, 
                styles.galleryButton,
                (!isNearAttraction && attraction.latitude !== null && attraction.longitude !== null) ? styles.disabledButton : null,
                submitting && styles.disabledButton,
                taskCompleted && styles.disabledButton,
                verificationResult?.isPending && styles.disabledButton
              ]}
              onPress={pickImage}
              disabled={taskCompleted || (!isNearAttraction && attraction.latitude !== null && attraction.longitude !== null) || submitting || verificationResult?.isPending}
            >
              <Icon name="image" size={24} color="white" />
              <Text style={styles.photoButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
          
          {/* Reviewing hint */}
          {verificationResult?.isPending && (
            <View style={styles.pendingBanner}>
              <Icon name="clock" size={24} color={theme.colors.warning} />
              <Text style={styles.pendingBannerText}>Waiting for review result, please wait...</Text>
            </View>
          )}
          
          {/* Task completed hint */}
          {taskCompleted && !image && (
            <View style={styles.completedBanner}>
              <Icon name="award" size={24} color={theme.colors.success} />
              <Text style={styles.completedBannerText}>You have completed this task and cannot submit again</Text>
            </View>
          )}
          
          {/* Submit button - Display when there is a photo and task is not completed/under review/rejected */}
          {image && !taskCompleted && (!verificationResult?.isPending || verificationResult?.isRejected) && (
            <TouchableOpacity 
              style={[
                styles.submitButton, 
                submitting && styles.disabledButton,
                verificationResult?.isRejected && styles.resubmitButton
              ]}
              onPress={() => submitTaskForVerification(attraction.id, image, 'Terracotta-Warriors')}
              disabled={submitting || (verificationResult?.isPending && !verificationResult?.isRejected)}
            >
              {submitting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.submitButtonText}>Verifying...</Text>
                </View>
              ) : verificationResult?.isRejected ? (
                <Text style={styles.submitButtonText}>Resubmit Task</Text>
              ) : (
                <Text style={styles.submitButtonText}>Submit Task</Text>
              )}
            </TouchableOpacity>
          )}
          
          {taskCompleted && image && (
            <View style={styles.completedContainer}>
              <Icon name="heart" size={50} color={theme.colors.primary} />
              <Text style={styles.completedText}>Task Completed!</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default Task;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    padding: wp(4),
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: theme.radius.lg,
    padding: wp(4),
    marginBottom: hp(2),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  taskTitle: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
  },
  taskBadge: {
    backgroundColor: theme.colors.primary + '20', // 20% opacity
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderRadius: theme.radius.sm,
  },
  taskBadgeText: {
    fontSize: hp(1.6),
    color: theme.colors.primary,
    fontWeight: theme.fonts.medium,
  },
  taskDescription: {
    fontSize: hp(1.8),
    color: theme.colors.text,
    lineHeight: hp(2.5),
    marginBottom: hp(2),
  },
  rewards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  rewardText: {
    fontSize: hp(1.7),
    color: theme.colors.textLight,
    fontWeight: theme.fonts.medium,
  },
  photoContainer: {
    width: '100%',
    height: hp(30),
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginVertical: hp(2),
    backgroundColor: '#f5f5f5',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: hp(1),
    fontSize: hp(1.7),
    color: theme.colors.textLight,
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: hp(2),
    gap: wp(4),
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: hp(1.5),
    borderRadius: theme.radius.lg,
    gap: wp(2),
  },
  cameraButton: {
    backgroundColor: theme.colors.primary,
  },
  galleryButton: {
    backgroundColor: theme.colors.textLight,
  },
  photoButtonText: {
    color: 'white',
    fontSize: hp(1.7),
    fontWeight: theme.fonts.medium,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: hp(1.8),
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    marginTop: hp(2),
  },
  submitButtonText: {
    color: 'white',
    fontSize: hp(1.8),
    fontWeight: theme.fonts.bold,
  },
  completedContainer: {
    alignItems: 'center',
    marginVertical: hp(3),
  },
  completedText: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
    marginTop: hp(1),
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(2),
    padding: hp(1),
    backgroundColor: '#f0f8ff',
    borderRadius: theme.radius.sm,
  },
  locationError: {
    backgroundColor: '#fff0f0',
  },
  locationText: {
    marginLeft: wp(2),
    fontSize: hp(1.5),
    color: theme.colors.text,
  },
  locationErrorText: {
    color: 'red',
  },
  loadingText: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
    fontStyle: 'italic',
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
  },
  verificationCard: {
    marginVertical: hp(2),
    padding: wp(4),
    borderRadius: theme.radius.lg,
    backgroundColor: '#F8F9FA',
  },
  successCard: {
    backgroundColor: '#E6F7EC',
    borderLeftWidth: 4,
    borderLeftColor: '#27AE60',
  },
  failureCard: {
    backgroundColor: '#FBEAEA',
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
  },
  verificationTitle: {
    fontSize: hp(1.8),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: hp(1),
  },
  confidenceText: {
    fontSize: hp(1.6),
    color: theme.colors.textLight,
    marginBottom: hp(1),
  },
  labelsContainer: {
    marginTop: hp(1),
  },
  labelsTitle: {
    fontSize: hp(1.6),
    fontWeight: theme.fonts.medium,
    color: theme.colors.text,
    marginBottom: hp(0.5),
  },
  labelItem: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
    marginLeft: wp(2),
    marginVertical: hp(0.2),
  },
  helpText: {
    fontSize: hp(1.5),
    fontStyle: 'italic',
    color: theme.colors.textLight,
    marginTop: hp(1),
  },
  pendingCard: {
    backgroundColor: '#FFF9E6',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  pendingText: {
    fontSize: hp(1.7),
    color: theme.colors.text,
    marginVertical: 8,
  },
  pendingInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: theme.radius.sm,
  },
  pendingInfoText: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
    marginVertical: 3,
  },
  completedCard: {
    backgroundColor: '#E6F7EC',
    borderLeftWidth: 4,
    borderLeftColor: '#27AE60',
  },
  completedMessage: {
    fontSize: hp(1.7),
    color: theme.colors.text,
    marginVertical: 8,
  },
  completedDetails: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: theme.radius.sm,
  },
  completedHint: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
    marginTop: 5,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#E6F7EC',
    borderRadius: theme.radius.sm,
  },
  completedBannerText: {
    fontSize: hp(1.7),
    color: theme.colors.text,
    marginLeft: 10,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFF9E6',
    borderRadius: theme.radius.sm,
  },
  pendingBannerText: {
    fontSize: hp(1.7),
    color: theme.colors.text,
    marginLeft: 10,
  },
  pendingTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(2),
    padding: wp(3),
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: theme.radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  pendingTipText: {
    fontSize: hp(1.5),
    color: theme.colors.primary,
    marginLeft: wp(2),
    fontWeight: '500',
  },
  rejectedCard: {
    backgroundColor: '#FBEAEA',
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
  },
  rejectedMessage: {
    fontSize: hp(1.7),
    color: theme.colors.text,
    marginVertical: 8,
  },
  rejectedInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: theme.radius.sm,
  },
  rejectedInfoText: {
    fontSize: hp(1.5),
    color: theme.colors.text,
    marginBottom: 3,
  },
  rejectedInfoItem: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
    marginVertical: 3,
  },
  rejectedTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(2),
    padding: wp(3),
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: theme.radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  rejectedTipText: {
    fontSize: hp(1.5),
    color: theme.colors.primary,
    marginLeft: wp(2),
    fontWeight: '500',
  },
  resubmitButton: {
    backgroundColor: theme.colors.warning,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
  },
}); 