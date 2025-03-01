// src/screens/auth/LoginScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, Image, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { TextInput, Button, Text, Title, Card } from 'react-native-paper';
import { useUserAuth } from '../../context/UserAuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { logIn } = useUserAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await logIn(email, password);
      // ไม่ต้องใช้ navigation.navigate ที่นี่เพราะ AppNavigator จะจัดการให้อัตโนมัติ
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.logoContainer}>
            <Image 
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/arproject-b2e7b.appspot.com/o/Logo%2Flogo-no-background.png?alt=media&token=49d57db2-d023-490f-a923-8d0760b121d5' }} 
              style={styles.logo} 
              resizeMode="contain"
            />
          </View>
          
          <Title style={styles.title}>เข้าสู่ระบบ</Title>
          
          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={24} color="#0d6efd" style={styles.icon} />
            <TextInput
              label="อีเมล"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              left={<TextInput.Icon icon="email" />}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={24} color="#0d6efd" style={styles.icon} />
            <TextInput
              label="รหัสผ่าน"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              left={<TextInput.Icon icon="lock" />}
            />
          </View>
          
          <Button 
            mode="contained" 
            onPress={handleLogin}
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            เข้าสู่ระบบ
          </Button>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>ยังไม่มีบัญชี?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>ลงทะเบียน</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    elevation: 4,
    borderRadius: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 200,
    height: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#0d6efd',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  button: {
    marginTop: 24,
    paddingVertical: 8,
    backgroundColor: '#0d6efd',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    marginRight: 4,
  },
  linkText: {
    color: '#0d6efd',
    fontWeight: 'bold',
  },
});