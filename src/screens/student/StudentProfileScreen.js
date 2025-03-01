// src/screens/student/StudentProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Button, Card, Text, Title, TextInput, List, Divider, ActivityIndicator } from 'react-native-paper';
import { useUserAuth } from '../../context/UserAuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function StudentProfileScreen() {
  const { user, logOut } = useUserAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [updatedProfile, setUpdatedProfile] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchStudentProfile();
  }, [user]);

  const fetchStudentProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const docRef = doc(db, "Students", user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        setUpdatedProfile(data);
      } else {
        Alert.alert('Error', 'Student profile not found');
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, "Students", user.uid);
      await updateDoc(docRef, updatedProfile);
      setProfile(updatedProfile);
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name, value) => {
    setUpdatedProfile(prev => ({ ...prev, [name]: value }));
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photos');
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
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadProfileImage = async (uri) => {
    try {
      setUploadingImage(true);
      
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const storageRef = ref(storage, `User/${user.email}/Profile/avatar.jpg`);
      await uploadBytes(storageRef, blob);
      
      const downloadURL = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, "Students", user.uid), {
        URLImage: downloadURL
      });
      
      setProfile(prev => ({ ...prev, URLImage: downloadURL }));
      setUpdatedProfile(prev => ({ ...prev, URLImage: downloadURL }));
      
      Alert.alert('Success', 'Profile image updated successfully');
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d6efd" />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={handlePickImage} disabled={uploadingImage}>
              {profile?.URLImage ? (
                <Image 
                  source={{ uri: profile.URLImage }} 
                  style={styles.profileImage} 
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={60} color="#ccc" />
                </View>
              )}
              {uploadingImage && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
              <View style={styles.editIconContainer}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            
            <View style={styles.nameContainer}>
              {editing ? (
                <View style={styles.nameEditContainer}>
                  <TextInput
                    label="ชื่อ"
                    value={updatedProfile.FirstName}
                    onChangeText={(text) => handleInputChange('FirstName', text)}
                    style={styles.nameInput}
                  />
                  <TextInput
                    label="นามสกุล"
                    value={updatedProfile.LastName}
                    onChangeText={(text) => handleInputChange('LastName', text)}
                    style={styles.nameInput}
                  />
                </View>
              ) : (
                <Title>{profile?.FirstName} {profile?.LastName}</Title>
              )}
              <Text style={styles.userTypeText}>นักเรียน</Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <List.Section>
            <List.Subheader>ข้อมูลผู้ใช้</List.Subheader>
            
            <List.Item
              title="Username"
              description={
                editing ? (
                  <TextInput
                    value={updatedProfile.Username}
                    onChangeText={(text) => handleInputChange('Username', text)}
                    style={styles.editInput}
                  />
                ) : profile?.Username
              }
              left={() => <List.Icon icon="account" />}
            />
            
            <List.Item
              title="Email"
              description={profile?.Email}
              left={() => <List.Icon icon="email" />}
            />
            
            <List.Item
              title="เพศ"
              description={
                editing ? (
                  <TextInput
                    value={updatedProfile.Gender}
                    onChangeText={(text) => handleInputChange('Gender', text)}
                    style={styles.editInput}
                  />
                ) : profile?.Gender || 'ไม่ระบุ'
              }
              left={() => <List.Icon icon="human-male-female" />}
            />
            
            <List.Item
              title="สถาบัน"
              description={
                editing ? (
                  <TextInput
                    value={updatedProfile.Institution}
                    onChangeText={(text) => handleInputChange('Institution', text)}
                    style={styles.editInput}
                  />
                ) : profile?.Institution || 'ไม่ระบุ'
              }
              left={() => <List.Icon icon="school" />}
            />
          </List.Section>
          
          <View style={styles.buttonContainer}>
            {editing ? (
              <>
                <Button 
                  mode="contained" 
                  onPress={handleSaveProfile} 
                  style={[styles.button, styles.saveButton]}
                >
                  บันทึก
                </Button>
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    setEditing(false);
                    setUpdatedProfile(profile);
                  }} 
                  style={styles.button}
                >
                  ยกเลิก
                </Button>
              </>
            ) : (
              <Button 
                mode="contained" 
                onPress={handleEditProfile} 
                style={styles.button}
                icon="account-edit"
              >
                แก้ไขข้อมูล
              </Button>
            )}
            
            <Button 
              mode="outlined" 
              onPress={logOut} 
              style={[styles.button, styles.logoutButton]}
              icon="logout"
            >
              ออกจากระบบ
            </Button>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0d6efd',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  nameContainer: {
    marginLeft: 16,
    flex: 1,
  },
  nameEditContainer: {
    flexDirection: 'column',
  },
  nameInput: {
    height: 40,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  userTypeText: {
    color: '#666',
    fontStyle: 'italic',
  },
  divider: {
    marginVertical: 16,
  },
  editInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    padding: 4,
  },
  buttonContainer: {
    marginTop: 24,
  },
  button: {
    marginVertical: 8,
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  logoutButton: {
    borderColor: '#dc3545',
    borderWidth: 1,
  },
});