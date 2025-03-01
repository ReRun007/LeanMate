// src/navigation/TeacherNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Screens
import TeacherHomeScreen from '../screens/teacher/TeacherHomeScreen';
import TeacherProfileScreen from '../screens/teacher/TeacherProfileScreen';
import ClassroomDetailsScreen from '../screens/teacher/ClassroomDetailsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TeacherTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={TeacherHomeScreen} />
      <Tab.Screen name="Profile" component={TeacherProfileScreen} />
    </Tab.Navigator>
  );
}

export default function TeacherNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="TeacherTabs" 
        component={TeacherTabNavigator} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ClassroomDetails" 
        component={ClassroomDetailsScreen} 
        options={({ route }) => ({ title: route.params?.classroomName || 'Classroom' })}
      />
      {/* เพิ่ม Screens อื่นๆ ที่นี่ */}
    </Stack.Navigator>
  );
}