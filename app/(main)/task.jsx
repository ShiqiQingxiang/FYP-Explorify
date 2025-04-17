import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, StatusBar, Alert, SafeAreaView } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { theme } from '../../constants/theme'
import { hp, wp } from '../../helpers/common'
import Icon from '../../assets/icons'
import * as ImagePicker from 'expo-image-picker'
import Header from '../../components/Header'

const Task = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [image, setImage] = useState(null);
  const [taskCompleted, setTaskCompleted] = useState(false);

  // 从参数中获取景点信息
  const attraction = {
    id: params.id,
    title: params.title || '景点任务',
    description: params.description || '完成此景点的任务挑战',
  };

  // 根据景点ID生成不同的任务
  const getTaskDetails = (id) => {
    const tasks = {
      '1': {
        title: '埃菲尔铁塔挑战',
        description: '在埃菲尔铁塔前拍一张"托举"铁塔的创意照片',
        points: 100,
        difficulty: '中等'
      },
      '2': {
        title: '故宫博物院挑战',
        description: '在故宫太和殿前摆出皇帝姿势拍照，或找到并拍摄一个隐藏的角楼细节',
        points: 120,
        difficulty: '简单'
      },
      '3': {
        title: '大峡谷挑战',
        description: '在大峡谷边缘安全地拍摄一张展示峡谷壮观景色的照片，确保包含独特的地质特征',
        points: 150,
        difficulty: '困难'
      },
      'default': {
        title: '景点探索挑战',
        description: '在此景点拍摄一张能体现其文化或自然特色的照片',
        points: 80,
        difficulty: '简单'
      }
    };
    
    return tasks[id] || tasks['default'];
  };
  
  const taskDetails = getTaskDetails(attraction.id);

  // 拍照功能
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('需要相机权限', '请在设置中允许应用访问您的相机');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // 从相册选择照片
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('需要相册权限', '请在设置中允许应用访问您的相册');
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
    }
  };

  // 提交任务
  const submitTask = () => {
    if (!image) {
      Alert.alert('提示', '请先拍照或选择照片');
      return;
    }
    
    // 模拟任务提交过程
    Alert.alert(
      '确认提交',
      '确定要提交此任务吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '提交', 
          onPress: () => {
            // 模拟一个网络请求
            setTimeout(() => {
              setTaskCompleted(true);
              Alert.alert(
                '任务完成!', 
                `恭喜获得 ${taskDetails.points} 积分!`,
                [{ text: '太棒了!', onPress: () => router.back() }]
              );
            }, 1500);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.container}>
        <Header title={taskDetails.title} />
        
        <ScrollView style={styles.content}>
          <View style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>任务详情</Text>
              <View style={styles.taskBadge}>
                <Text style={styles.taskBadgeText}>{taskDetails.difficulty}</Text>
              </View>
            </View>
            
            <Text style={styles.taskDescription}>{taskDetails.description}</Text>
            
            <View style={styles.rewards}>
              <Icon name="heart" size={20} color={theme.colors.primary} />
              <Text style={styles.rewardText}>完成可获得 {taskDetails.points} 积分</Text>
            </View>
          </View>
          
          {/* 照片预览区域 */}
          <View style={styles.photoContainer}>
            {image ? (
              <Image source={{ uri: image }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Icon name="camera" size={50} color={theme.colors.gray} />
                <Text style={styles.photoPlaceholderText}>尚未选择照片</Text>
              </View>
            )}
          </View>
          
          {/* 拍照/选择照片按钮 */}
          <View style={styles.photoButtons}>
            <TouchableOpacity 
              style={[styles.photoButton, styles.cameraButton]}
              onPress={takePhoto}
              disabled={taskCompleted}
            >
              <Icon name="camera" size={24} color="white" />
              <Text style={styles.photoButtonText}>拍照</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.photoButton, styles.galleryButton]}
              onPress={pickImage}
              disabled={taskCompleted}
            >
              <Icon name="image" size={24} color="white" />
              <Text style={styles.photoButtonText}>相册</Text>
            </TouchableOpacity>
          </View>
          
          {/* 提交按钮 */}
          {image && !taskCompleted && (
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={submitTask}
            >
              <Text style={styles.submitButtonText}>提交任务</Text>
            </TouchableOpacity>
          )}
          
          {taskCompleted && (
            <View style={styles.completedContainer}>
              <Icon name="heart" size={50} color={theme.colors.primary} />
              <Text style={styles.completedText}>任务已完成!</Text>
              <Text style={styles.pointsText}>+{taskDetails.points} 积分</Text>
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
  pointsText: {
    fontSize: hp(2),
    fontWeight: theme.fonts.bold,
    color: theme.colors.primary,
    marginTop: hp(0.5),
  },
}); 