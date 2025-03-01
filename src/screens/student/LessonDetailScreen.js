// src/screens/student/LessonDetailScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, ActivityIndicator, Alert } from 'react-native';
import { Card, Title, Paragraph, Text, Button, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';
import { useUserAuth } from '../../context/UserAuthContext';
import { recordLessonView } from '../../utils/attendanceUtils';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const LessonDetailScreen = ({ route, navigation }) => {
  const { lesson, classId } = route.params;
  const { width } = useWindowDimensions();
  const { user } = useUserAuth();
  const [loading, setLoading] = useState(false);
  const [viewStartTime, setViewStartTime] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // เริ่มจับเวลาเมื่อเข้าดูบทเรียน
    setViewStartTime(Date.now());
    
    // เมื่อออกจากหน้านี้ให้บันทึกเวลาที่ใช้ดูบทเรียน
    return () => {
      recordViewDuration();
    };
  }, []);

  const recordViewDuration = async () => {
    if (viewStartTime && user && lesson && classId) {
      const duration = Math.round((Date.now() - viewStartTime) / 1000);
      try {
        await recordLessonView(user.uid, classId, lesson.id, duration);
        console.log('Lesson view recorded successfully');
      } catch (error) {
        console.error('Error recording lesson view:', error);
      }
    }
  };

  const handleDownloadFile = async () => {
    if (!lesson.fileUrl) return;
    
    try {
      setDownloading(true);
      setDownloadProgress(0);
      
      // สร้างชื่อไฟล์
      const fileExtension = lesson.fileUrl.split('.').pop();
      const fileName = `${lesson.title.replace(/\s+/g, '_')}.${fileExtension}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // ดาวน์โหลดไฟล์
      const downloadResumable = FileSystem.createDownloadResumable(
        lesson.fileUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        }
      );
      
      const { uri } = await downloadResumable.downloadAsync();
      
      // เช็คว่าสามารถแชร์ไฟล์ได้หรือไม่
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert(
          "Sharing not available",
          "Sharing is not available on your device"
        );
      }
      
      setDownloading(false);
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Failed to download file');
      setDownloading(false);
    }
  };

  const source = {
    html: lesson?.content || '<p>No content available</p>'
  };

  const renderFileButton = () => {
    if (!lesson.fileUrl) return null;
    
    const fileType = lesson.fileUrl.split('.').pop().toLowerCase();
    let icon = 'document';
    
    // กำหนดไอคอนตามประเภทไฟล์
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
      icon = 'image';
    } else if (['mp4', 'mov', 'avi'].includes(fileType)) {
      icon = 'videocam';
    } else if (['pdf'].includes(fileType)) {
      icon = 'document-text';
    }
    
    return (
      <Button 
        mode="contained" 
        icon={() => <Ionicons name={icon} size={20} color="white" />}
        onPress={handleDownloadFile}
        loading={downloading}
        disabled={downloading}
        style={styles.fileButton}
      >
        {downloading ? `Downloading ${Math.round(downloadProgress * 100)}%` : 'Download Attachment'}
      </Button>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>{lesson?.title}</Title>
          <Paragraph style={styles.description}>{lesson?.description}</Paragraph>
          
          <Divider style={styles.divider} />
          
          <Text style={styles.contentTitle}>Lesson Content</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#0d6efd" style={styles.loader} />
          ) : (
            <View style={styles.htmlContainer}>
              <RenderHtml
                contentWidth={width - 32}
                source={source}
                tagsStyles={{
                  p: { fontSize: 16, lineHeight: 24, color: '#333' },
                  h1: { fontSize: 24, fontWeight: 'bold', color: '#222' },
                  h2: { fontSize: 22, fontWeight: 'bold', color: '#222' },
                  h3: { fontSize: 20, fontWeight: 'bold', color: '#222' },
                  li: { fontSize: 16, lineHeight: 24, color: '#333' },
                  a: { color: '#0d6efd' },
                  img: { maxWidth: width - 32 },
                }}
              />
            </View>
          )}
          
          {renderFileButton()}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  htmlContainer: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
  },
  loader: {
    marginVertical: 20,
  },
  fileButton: {
    marginTop: 24,
    marginBottom: 8,
  },
});

export default LessonDetailScreen;