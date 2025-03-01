// src/navigation/StudentNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Screens
import StudentHomeScreen from '../screens/student/StudentHomeScreen';
import StudentProfileScreen from '../screens/student/StudentProfileScreen';
import StudentClassroomDetailsScreen from '../screens/student/StudentClassroomDetailsScreen';
import StudentQuizScreen from '../screens/student/StudentQuizScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function StudentTabNavigator() {
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
      <Tab.Screen name="Home" component={StudentHomeScreen} />
      <Tab.Screen name="Profile" component={StudentProfileScreen} />
    </Tab.Navigator>
  );
}

export default function StudentNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="StudentTabs" 
        component={StudentTabNavigator} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ClassroomDetails" 
        component={StudentClassroomDetailsScreen} 
        options={({ route }) => ({ title: route.params?.classroomName || 'Classroom' })}
      />
      <Stack.Screen 
        name="Quiz" 
        component={StudentQuizScreen} 
        options={{ title: 'Quiz' }}
      />
      {/* เพิ่ม Screens อื่นๆ ที่นี่ */}
    </Stack.Navigator>
  );
}