// src/screens/teacher/TeacherHomeScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useUserAuth } from '../../context/UserAuthContext';

export default function TeacherProfileScreen() {
  const { logOut } = useUserAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Teacher Profile Screen</Text>
      <Text style={styles.subtitle}>Welcome to LearnMate!</Text>
      <Button mode="contained" onPress={logOut} style={styles.button}>
        Log Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  button: {
    marginTop: 24,
  },
});