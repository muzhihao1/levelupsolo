# Level Up Solo iOS App 开发方案

## 项目概述

本方案将指导您将现有的 Level Up Solo Replit Web 应用转换为 iOS 原生应用。我们将采用**混合开发方案**，保留现有后端，使用 React Native 开发 iOS 应用，这样可以最大限度地重用现有代码。

### 为什么选择 React Native？

1. **代码复用率高**：您现有的 React 代码可以复用 70-80%
2. **学习成本低**：您已经熟悉 React，无需学习 Swift
3. **开发速度快**：可以在 3-4 周内完成基础版本
4. **维护成本低**：一套代码可以同时支持 iOS 和 Android

## 开发方案对比

| 方案 | 优点 | 缺点 | 开发时间 | 适合程度 |
|------|------|------|----------|----------|
| **React Native** | 代码复用率高、开发快、跨平台 | 性能略低于原生 | 3-4周 | ⭐⭐⭐⭐⭐ |
| Swift 原生 | 性能最佳、用户体验好 | 需要重写所有代码、学习成本高 | 8-12周 | ⭐⭐ |
| Flutter | 性能好、跨平台 | 需要学习 Dart、重写代码 | 6-8周 | ⭐⭐⭐ |
| WebView 封装 | 最简单、成本最低 | 体验差、功能受限 | 1周 | ⭐ |

## 整体架构设计

```
┌─────────────────────────────────────────────┐
│         iOS App (React Native)              │
│  ┌─────────────────────────────────────┐   │
│  │   重用现有 React 组件 (70-80%)       │   │
│  │   + React Native 特定组件            │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    ↕ HTTPS
┌─────────────────────────────────────────────┐
│    现有后端 API (Node.js + Express)         │
│         需要小幅改造以支持移动端             │
└─────────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────────┐
│       PostgreSQL 数据库 (不变)              │
└─────────────────────────────────────────────┘
```

## 开发步骤详细指南

### 第一阶段：环境准备和项目初始化（第1周）

#### 1.1 安装开发环境

**步骤 1：安装 Xcode**
```bash
# 1. 打开 Mac App Store
# 2. 搜索 "Xcode"
# 3. 点击 "获取" 安装（约 7GB，需要 20-30 分钟）
# 4. 安装完成后，打开 Xcode，同意许可协议
# 5. 等待 Xcode 安装额外组件
```

**步骤 2：安装 React Native 开发环境**
```bash
# 打开终端，依次执行以下命令

# 1. 安装 Homebrew（如果没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. 安装 Node.js 18+（如果版本低于 18）
brew install node@18

# 3. 安装 Watchman（Facebook 的文件监控工具）
brew install watchman

# 4. 安装 CocoaPods（iOS 依赖管理工具）
sudo gem install cocoapods

# 5. 安装 React Native CLI
npm install -g react-native-cli
```

#### 1.2 创建 React Native 项目

```bash
# 1. 进入项目目录
cd "/Users/liasiloam/Library/CloudStorage/Dropbox/个人项目/！AI项目/level up solo"

# 2. 创建 React Native 项目
npx react-native init LevelUpSoloMobile --typescript

# 3. 进入项目目录
cd LevelUpSoloMobile

# 4. 安装 iOS 依赖
cd ios && pod install && cd ..

# 5. 测试运行（确保 iPhone 模拟器已启动）
npx react-native run-ios
```

### 第二阶段：后端 API 改造（第1-2周）

#### 2.1 添加移动端认证支持

需要修改现有的 Replit Auth 为 JWT 认证：

**文件：`levelupsolo/server/auth-mobile.ts`**
```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

// 生成 JWT Token
export function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// 验证 JWT Token
export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// 添加移动端登录接口
export async function mobileLogin(email: string, password: string) {
  // 查询用户
  const user = await db.select().from(users).where(eq(users.email, email)).get();
  
  if (!user) {
    throw new Error('用户不存在');
  }
  
  // 验证密码
  const isValid = await bcrypt.compare(password, user.password);
  
  if (!isValid) {
    throw new Error('密码错误');
  }
  
  // 生成 token
  const token = generateToken(user.id);
  
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    }
  };
}
```

#### 2.2 添加 CORS 支持

**修改 `levelupsolo/server/index.ts`：**
```typescript
import cors from 'cors';

// 添加 CORS 配置
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8081', // React Native Metro bundler
    'exp://localhost:8081'   // Expo
  ],
  credentials: true
}));
```

#### 2.3 优化 API 响应格式

创建统一的响应格式：

**文件：`levelupsolo/server/response-formatter.ts`**
```typescript
export function successResponse(data: any, message = 'Success') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

export function errorResponse(message: string, code = 400) {
  return {
    success: false,
    message,
    error: { code, message },
    timestamp: new Date().toISOString()
  };
}
```

### 第三阶段：React Native 应用开发（第2-4周）

#### 3.1 项目结构设置

```
LevelUpSoloMobile/
├── src/
│   ├── components/      # 可复用组件
│   ├── screens/        # 页面组件
│   ├── navigation/     # 导航配置
│   ├── services/       # API 服务
│   ├── store/          # 状态管理
│   ├── utils/          # 工具函数
│   └── types/          # TypeScript 类型
├── ios/                # iOS 原生代码
├── android/            # Android 原生代码
└── shared/             # 共享代码（从 Web 项目复制）
```

#### 3.2 安装必要的依赖

```bash
# 导航
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install react-native-gesture-handler react-native-reanimated

# 状态管理和数据请求
npm install @tanstack/react-query axios

# UI 组件库
npm install react-native-elements react-native-vector-icons
npm install react-native-svg react-native-svg-charts

# 存储
npm install @react-native-async-storage/async-storage

# 工具库
npm install react-native-keychain # 安全存储 token
npm install react-native-device-info

# iOS 依赖安装
cd ios && pod install && cd ..
```

#### 3.3 配置导航结构

**文件：`LevelUpSoloMobile/src/navigation/AppNavigator.tsx`**
```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';

// 导入页面
import DashboardScreen from '../screens/DashboardScreen';
import TasksScreen from '../screens/TasksScreen';
import SkillsScreen from '../screens/SkillsScreen';
import GoalsScreen from '../screens/GoalsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === '仪表盘') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === '任务') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === '技能') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === '目标') {
            iconName = focused ? 'flag' : 'flag-outline';
          } else if (route.name === '我的') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="仪表盘" component={DashboardScreen} />
      <Tab.Screen name="任务" component={TasksScreen} />
      <Tab.Screen name="技能" component={SkillsScreen} />
      <Tab.Screen name="目标" component={GoalsScreen} />
      <Tab.Screen name="我的" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Main" 
          component={MainTabs} 
          options={{ headerShown: false }}
        />
        {/* 其他堆栈页面 */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

#### 3.4 创建 API 服务层

**文件：`LevelUpSoloMobile/src/services/api.ts`**
```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API 基础配置
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000/api' 
  : 'https://your-production-api.com/api';

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期，跳转到登录页
      AsyncStorage.removeItem('authToken');
      // 导航到登录页
    }
    return Promise.reject(error);
  }
);

// API 方法
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  
  register: (data: any) => 
    api.post('/auth/register', data),
  
  logout: () => 
    api.post('/auth/logout'),
};

export const tasksAPI = {
  getTasks: () => api.get('/tasks'),
  createTask: (task: any) => api.post('/tasks', task),
  updateTask: (id: string, task: any) => api.put(`/tasks/${id}`, task),
  deleteTask: (id: string) => api.delete(`/tasks/${id}`),
  completeTask: (id: string) => api.post(`/tasks/${id}/complete`),
};

export const skillsAPI = {
  getSkills: () => api.get('/skills'),
  updateSkill: (id: string, data: any) => api.put(`/skills/${id}`, data),
};

export default api;
```

#### 3.5 移植核心组件

将现有的 React 组件转换为 React Native 组件。以任务卡片为例：

**原 React 组件：`client/src/components/enhanced-task-card.tsx`**
**新 React Native 组件：`LevelUpSoloMobile/src/components/TaskCard.tsx`**

```typescript
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskCard({ 
  task, 
  onComplete, 
  onEdit, 
  onDelete 
}: TaskCardProps) {
  const handleComplete = () => {
    Alert.alert(
      '完成任务',
      `确定要完成任务"${task.title}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        { text: '确定', onPress: () => onComplete(task.id) },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      '删除任务',
      `确定要删除任务"${task.title}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '删除', 
          style: 'destructive',
          onPress: () => onDelete(task.id) 
        },
      ]
    );
  };

  return (
    <View style={[styles.card, task.completed && styles.completedCard]}>
      <TouchableOpacity 
        style={styles.mainContent}
        onPress={() => onEdit(task)}
      >
        <View style={styles.header}>
          <Text style={[styles.title, task.completed && styles.completedText]}>
            {task.title}
          </Text>
          <View style={styles.badges}>
            {task.taskType === 'habit' && (
              <View style={styles.badge}>
                <Icon name="repeat" size={16} color="#6366f1" />
              </View>
            )}
            <Text style={styles.energyBalls}>
              {task.requiredEnergyBalls} ⚡
            </Text>
          </View>
        </View>
        
        {task.description && (
          <Text style={styles.description} numberOfLines={2}>
            {task.description}
          </Text>
        )}
        
        <View style={styles.footer}>
          <Text style={styles.skill}>{task.skillName}</Text>
          <Text style={styles.difficulty}>{task.difficulty}</Text>
        </View>
      </TouchableOpacity>
      
      <View style={styles.actions}>
        {!task.completed && (
          <TouchableOpacity 
            style={styles.completeButton}
            onPress={handleComplete}
          >
            <Icon name="checkmark-circle" size={24} color="#10b981" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Icon name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    opacity: 0.7,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    padding: 4,
  },
  energyBalls: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skill: {
    fontSize: 12,
    color: '#6366f1',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficulty: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  completeButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
});
```

### 第四阶段：核心功能实现（第3-4周）

#### 4.1 实现登录功能

**文件：`LevelUpSoloMobile/src/screens/LoginScreen.tsx`**
```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('错误', '请输入邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login(email, password);
      
      // 保存 token
      await AsyncStorage.setItem('authToken', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      
      // 导航到主页
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('登录失败', error.response?.data?.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Level Up Solo</Text>
        <Text style={styles.subtitle}>开启你的成长冒险之旅</Text>
        
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="邮箱"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="密码"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '登录中...' : '登录'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 48,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

#### 4.2 实现任务列表页面

**文件：`LevelUpSoloMobile/src/screens/TasksScreen.tsx`**
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';
import TaskCard from '../components/TaskCard';
import { tasksAPI } from '../services/api';

export default function TasksScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('all');
  const queryClient = useQueryClient();

  // 获取任务列表
  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksAPI.getTasks,
  });

  // 完成任务
  const completeMutation = useMutation({
    mutationFn: tasksAPI.completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
    },
  });

  // 删除任务
  const deleteMutation = useMutation({
    mutationFn: tasksAPI.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
    },
  });

  // 过滤任务
  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'all') return true;
    if (activeTab === 'main') return task.taskType === 'main';
    if (activeTab === 'side') return task.taskType === 'side';
    if (activeTab === 'habit') return task.taskType === 'habit';
    return true;
  });

  const renderTask = ({ item }) => (
    <TaskCard
      task={item}
      onComplete={(id) => completeMutation.mutate(id)}
      onEdit={(task) => navigation.navigate('EditTask', { task })}
      onDelete={(id) => deleteMutation.mutate(id)}
    />
  );

  return (
    <View style={styles.container}>
      {/* 标签栏 */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            全部
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'main' && styles.activeTab]}
          onPress={() => setActiveTab('main')}
        >
          <Text style={[styles.tabText, activeTab === 'main' && styles.activeTabText]}>
            主线
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'side' && styles.activeTab]}
          onPress={() => setActiveTab('side')}
        >
          <Text style={[styles.tabText, activeTab === 'side' && styles.activeTabText]}>
            支线
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'habit' && styles.activeTab]}
          onPress={() => setActiveTab('habit')}
        >
          <Text style={[styles.tabText, activeTab === 'habit' && styles.activeTabText]}>
            习惯
          </Text>
        </TouchableOpacity>
      </View>

      {/* 任务列表 */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="clipboard-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>暂无任务</Text>
          </View>
        }
      />

      {/* 添加按钮 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTask')}
      >
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#6366f1',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
```

### 第五阶段：测试和发布（第4周）

#### 5.1 在真机上测试

**步骤 1：配置开发者账号**
1. 打开 Xcode
2. 点击 Xcode → Preferences → Accounts
3. 点击 + 号添加你的 Apple ID
4. 选择你的账号，点击 Manage Certificates
5. 点击 + 号创建开发证书

**步骤 2：在真机上运行**
1. 连接你的 iPhone 到电脑
2. 在 iPhone 上信任这台电脑
3. 在 Xcode 中选择你的设备
4. 运行项目：`npx react-native run-ios --device`

#### 5.2 构建发布版本

**步骤 1：配置应用信息**
1. 打开 `ios/LevelUpSoloMobile.xcworkspace`
2. 选择项目设置
3. 配置 Bundle Identifier（如：com.yourname.levelupsolo）
4. 配置应用图标和启动屏

**步骤 2：构建 Archive**
1. 选择 Generic iOS Device
2. 点击 Product → Archive
3. 等待构建完成

**步骤 3：上传到 App Store Connect**
1. 在 Archive Organizer 中选择构建
2. 点击 Distribute App
3. 选择 App Store Connect
4. 按提示完成上传

## 常见问题解决方案

### 1. 网络请求问题

**问题**：iOS 真机无法连接本地开发服务器

**解决方案**：
```javascript
// 在 api.ts 中使用你的电脑 IP 地址
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.100:5000/api'  // 替换为你的电脑 IP
  : 'https://your-production-api.com/api';
```

### 2. 图片和图标问题

**问题**：React Native 不支持 SVG 图标

**解决方案**：
1. 使用 react-native-vector-icons
2. 或安装 react-native-svg 支持 SVG

### 3. 样式差异问题

**问题**：Tailwind CSS 在 React Native 中不能用

**解决方案**：
1. 使用 StyleSheet 重写样式
2. 或使用 NativeWind（Tailwind for React Native）

### 4. 路由差异

**问题**：Wouter 在 React Native 中不能用

**解决方案**：
使用 React Navigation，已在上面的代码中展示

## 性能优化建议

1. **图片优化**
   - 使用 WebP 格式
   - 实现图片懒加载
   - 使用适当的图片尺寸

2. **列表优化**
   - 使用 FlatList 而不是 ScrollView
   - 实现 getItemLayout 优化
   - 使用 windowSize 和 initialNumToRender

3. **状态管理优化**
   - 使用 React Query 缓存
   - 避免不必要的重渲染
   - 使用 useMemo 和 useCallback

4. **包大小优化**
   - 启用 Hermes 引擎
   - 移除未使用的依赖
   - 使用代码分割

## 后续扩展

1. **推送通知**
   - 集成 react-native-push-notification
   - 实现任务提醒
   - 习惯打卡提醒

2. **离线支持**
   - 使用 Redux Persist 或 MMKV
   - 实现数据同步队列
   - 离线状态检测

3. **生物识别**
   - 集成 Touch ID/Face ID
   - 安全存储敏感数据

4. **Apple Watch 支持**
   - 创建 Watch 扩展
   - 同步任务数据
   - 快速操作支持

## 总结

这个方案可以让你在 3-4 周内完成一个基础但功能完整的 iOS 应用。主要优势：

1. **最大化代码复用**：70-80% 的 React 代码可以直接使用
2. **快速上手**：你已经熟悉 React，学习曲线平缓
3. **跨平台支持**：未来可以轻松支持 Android
4. **成本效益高**：开发时间短，维护成本低

建议按照以下顺序进行：
1. 第一周：环境搭建 + 后端 API 改造
2. 第二周：基础 UI 搭建 + 核心功能移植
3. 第三周：完善功能 + 优化体验
4. 第四周：测试 + 发布准备

需要我协助你开始第一步吗？