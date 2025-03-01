// src/screens/auth/RegisterScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, Image, Alert, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Text, Title, Card, RadioButton } from 'react-native-paper';
import { useUserAuth } from '../../context/UserAuthContext';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc } from 'firebase/firestore';
import { db, storage } from '../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [institution, setInstitution] = useState('');
  const [userType, setUserType] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  
  const { signUp } = useUserAuth();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload an image.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setAvatarUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRegister = async () => {
    if (!firstName || !lastName || !username || !email || !password || !confirmPassword || !userType) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Create user with email and password
      const userCredential = await signUp(email, password);
      const user = userCredential.user;
      
      // Default profile image URL
      let profileImageUrl = "https://firebasestorage.googleapis.com/v0/b/arproject-b2e7b.appspot.com/o/Profile%2FAvata%2Fa01.jpg?alt=media";
      
      // Upload avatar if selected
      if (avatarUrl) {
        const imageRef = ref(storage, `User/${user.email}/Profile/avatar.jpg`);
        
        // Convert URI to blob for Firebase Storage
        const response = await fetch(avatarUrl);
        const blob = await response.blob();
        
        await uploadBytes(imageRef, blob);
        profileImageUrl = await getDownloadURL(imageRef);
      }
      
      // Collection name based on user type
      const collectionName = userType === 'student' ? 'Students' : 'Teachers';
      const docRef = doc(db, collectionName, user.uid);
      
      // Create user data in Firestore
      await setDoc(docRef, {
        FirstName: firstName,
        LastName: lastName,
        Username: username,
        Email: email,
        Gender: gender || '',
        BirthDate: birthdate || '',
        Institution: institution || '',
        UserType: userType,
        URLImage: profileImageUrl
      });
      
      Alert.alert('Success', 'Registration successful!', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>สร้างบัญชีใหม่</Title>
          
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={pickImage}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={60} color="#ccc" />
                </View>
              )}
              <Text style={styles.avatarText}>เลือกรูปโปรไฟล์</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.userTypeContainer}>
            <Text style={styles.sectionTitle}>ประเภทผู้ใช้:</Text>
            <View style={styles.radioGroup}>
              <View style={styles.radioButton}>
                <RadioButton
                  value="student"
                  status={userType === 'student' ? 'checked' : 'unchecked'}
                  onPress={() => setUserType('student')}
                  color="#0d6efd"
                />
                <Text style={styles.radioLabel}>นักเรียน</Text>
              </View>
              <View style={styles.radioButton}>
                <RadioButton
                  value="teacher"
                  status={userType === 'teacher' ? 'checked' : 'unchecked'}
                  onPress={() => setUserType('teacher')}
                  color="#0d6efd"
                />
                <Text style={styles.radioLabel}>ครู</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.formRow}>
            <View style={[styles.formControl, { marginRight: 8 }]}>
              <TextInput
                label="ชื่อ"
                value={firstName}
                onChangeText={setFirstName}
                style={styles.input}
                left={<TextInput.Icon icon="account" />}
              />
            </View>
            <View style={styles.formControl}>
              <TextInput
                label="นามสกุล"
                value={lastName}
                onChangeText={setLastName}
                style={styles.input}
                left={<TextInput.Icon icon="account" />}
              />
            </View>
          </View>
          
          <TextInput
            label="ชื่อผู้ใช้"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />
          
          <TextInput
            label="อีเมล"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email" />}
          />
          
          <TextInput
            label="รหัสผ่าน"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
          />
          
          <TextInput
            label="ยืนยันรหัสผ่าน"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
          />
          
          <View style={styles.optionalSection}>
            <Text style={styles.sectionTitle}>ข้อมูลเพิ่มเติม (ไม่บังคับ)</Text>
            
            <View style={styles.genderContainer}>
              <Text style={styles.label}>เพศ:</Text>
              <View style={styles.radioGroup}>
                <View style={styles.radioButton}>
                  <RadioButton
                    value="male"
                    status={gender === 'male' ? 'checked' : 'unchecked'}
                    onPress={() => setGender('male')}
                    color="#0d6efd"
                  />
                  <Text style={styles.radioLabel}>ชาย</Text>
                </View>
                <View style={styles.radioButton}>
                  <RadioButton
                    value="female"
                    status={gender === 'female' ? 'checked' : 'unchecked'}
                    onPress={() => setGender('female')}
                    color="#0d6efd"
                  />
                  <Text style={styles.radioLabel}>หญิง</Text>
                </View>
                <View style={styles.radioButton}>
                  <RadioButton
                    value="other"
                    status={gender === 'other' ? 'checked' : 'unchecked'}
                    onPress={() => setGender('other')}
                    color="#0d6efd"
                  />
                  <Text style={styles.radioLabel}>อื่นๆ</Text>
                </View>
              </View>
            </View>
            
            <TextInput
              label="วันเกิด"
              value={birthdate}
              onChangeText={setBirthdate}
              style={styles.input}
              placeholder="YYYY-MM-DD"
              left={<TextInput.Icon icon="calendar" />}
            />
            
            <TextInput
              label="สถาบัน"
              value={institution}
              onChangeText={setInstitution}
              style={styles.input}
              left={<TextInput.Icon icon="school" />}
            />
          </View>
          
          <Button
            mode="contained"
            onPress={handleRegister}
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            ลงทะเบียน
          </Button>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>มีบัญชีอยู่แล้ว?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>เข้าสู่ระบบ</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginVertical: 16,
    elevation: 4,
    borderRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
    color: '#0d6efd',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: '#0d6efd',
    marginTop: 8,
  },
  userTypeContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  radioLabel: {
    marginLeft: 4,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  formControl: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  optionalSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  genderContainer: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  button: {
    paddingVertical: 8,
    backgroundColor: '#0d6efd',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  footerText: {
    marginRight: 4,
  },
  linkText: {
    color: '#0d6efd',
    fontWeight: 'bold',
  },
});