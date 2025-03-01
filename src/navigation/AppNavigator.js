// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useUserAuth } from '../context/UserAuthContext';
import { ActivityIndicator, View } from 'react-native';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Teacher Navigators
import TeacherNavigator from './TeacherNavigator';
// Student Navigators
import StudentNavigator from './StudentNavigator';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading, userType } = useUserAuth();
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // ผู้ใช้ล็อกอินแล้ว - แสดงหน้าตามประเภทผู้ใช้
          userType === 'teacher' ? (
            <Stack.Screen name="TeacherApp" component={TeacherNavigator} />
          ) : (
            <Stack.Screen name="StudentApp" component={StudentNavigator} />
          )
        ) : (
          // ผู้ใช้ยังไม่ล็อกอิน - แสดงหน้า Auth
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}