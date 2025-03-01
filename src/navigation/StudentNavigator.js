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
import LessonDetailScreen from '../screens/student/LessonDetailScreen';
import QuizScreen from '../screens/student/QuizScreen';



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
        name="LessonDetail"
        component={LessonDetailScreen}
        options={({ route }) => ({ title: route.params?.lesson?.title || 'Lesson' })}
      />
      <Stack.Screen
        name="Quiz"
        component={QuizScreen}
        options={({ route }) => ({
          title: 'Quiz',
          headerShown: true,
          // Disable back button during quiz
          headerLeft: () => null
        })}
      />
    </Stack.Navigator>
  );
}