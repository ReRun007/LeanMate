// src/screens/student/StudentHomeScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, FAB, Text, ActivityIndicator, Modal, TextInput, List } from 'react-native-paper';
import { useUserAuth } from '../../context/UserAuthContext';
import { collection, query, where, getDocs, addDoc, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function StudentHomeScreen({ navigation }) {
  const { user } = useUserAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [joiningClass, setJoiningClass] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    if (classrooms.length > 0) {
      fetchUpcomingAssignments();
    }
  }, [classrooms]);

  const fetchClassrooms = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get enrollments
      const enrollmentsQuery = query(
        collection(db, "ClassEnrollments"),
        where("studentId", "==", user.uid)
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      const classIds = enrollmentsSnapshot.docs.map(doc => doc.data().classId);
      
      if (classIds.length > 0) {
        // Get classroom details
        const classroomsData = await Promise.all(
          classIds.map(async (classId) => {
            const classroomRef = doc(db, "Classrooms", classId);
            const classroomSnap = await getDoc(classroomRef);
            
            if (classroomSnap.exists()) {
              const data = classroomSnap.data();
              
              // Get teacher info
              const teacherId = data.TeachersID.split('/')[2];
              const teacherRef = doc(db, "Teachers", teacherId);
              const teacherSnap = await getDoc(teacherRef);
              let teacherName = 'Unknown Teacher';
              
              if (teacherSnap.exists()) {
                const teacherData = teacherSnap.data();
                teacherName = `${teacherData.FirstName} ${teacherData.LastName}`;
              }
              
              return {
                ...data,
                id: classroomSnap.id,
                teacherName
              };
            }
            return null;
          })
        );
        
        setClassrooms(classroomsData.filter(Boolean));
      } else {
        setClassrooms([]);
      }
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      Alert.alert('Error', 'Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingAssignments = async () => {
    if (!user || classrooms.length === 0) return;
    
    try {
      setLoadingAssignments(true);
      const now = new Date();
      
      const classIds = classrooms.map(c => c.ClassId);
      const assignmentsPromises = classIds.map(async (classId) => {
        const q = query(
          collection(db, "Assignments"),
          where("classId", "==", classId),
          orderBy("dueDateTime")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          className: classrooms.find(c => c.ClassId === classId)?.ClassName || 'Unknown'
        }));
      });
      
      const allAssignments = (await Promise.all(assignmentsPromises)).flat();
      
      // Filter for assignments due in the future
      const upcomingAssignments = allAssignments.filter(a => {
        const dueDate = new Date(a.dueDateTime);
        return dueDate > now;
      });
      
      // Sort by due date
      upcomingAssignments.sort((a, b) => {
        return new Date(a.dueDateTime) - new Date(b.dueDateTime);
      });
      
      // Get only the next 5 assignments
      setAssignments(upcomingAssignments.slice(0, 5));
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleJoinClass = async () => {
    if (!classCode.trim()) {
      Alert.alert('Error', 'Please enter a class code');
      return;
    }
    
    try {
      setJoiningClass(true);
      
      // Check if class exists
      const classQuery = query(
        collection(db, "Classrooms"),
        where("ClassId", "==", classCode)
      );
      const classSnapshot = await getDocs(classQuery);
      
      if (classSnapshot.empty) {
        Alert.alert('Error', 'Invalid class code');
        return;
      }
      
      const classroomDoc = classSnapshot.docs[0];
      const classroomId = classroomDoc.id;
      
      // Check if already enrolled
      const enrollmentQuery = query(
        collection(db, "ClassEnrollments"),
        where("studentId", "==", user.uid),
        where("classId", "==", classroomId)
      );
      const enrollmentSnapshot = await getDocs(enrollmentQuery);
      
      if (!enrollmentSnapshot.empty) {
        Alert.alert('Error', 'You are already enrolled in this class');
        return;
      }
      
      // Enroll in class
      await addDoc(collection(db, "ClassEnrollments"), {
        classId: classroomId,
        studentId: user.uid,
        enrollmentDate: new Date().toISOString()
      });
      
      setShowJoinModal(false);
      setClassCode('');
      
      Alert.alert('Success', 'Joined classroom successfully');
      fetchClassrooms();
    } catch (error) {
      console.error("Error joining classroom:", error);
      Alert.alert('Error', 'Failed to join classroom');
    } finally {
      setJoiningClass(false);
    }
  };

  const handleClassroomPress = (classroom) => {
    navigation.navigate('ClassroomDetails', { 
      classId: classroom.ClassId,
      classroomName: classroom.ClassName 
    });
  };

  const renderClassroomCard = ({ item }) => (
    <TouchableOpacity onPress={() => handleClassroomPress(item)}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>{item.ClassName}</Title>
          <Paragraph numberOfLines={2}>{item.ClassDescription || 'No description'}</Paragraph>
          
          <View style={styles.cardFooter}>
            <Text style={styles.teacherName}>
              <Ionicons name="person" size={14} color="#666" /> {item.teacherName}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderAssignmentItem = ({ item }) => (
    <List.Item
      title={item.title}
      description={`${item.className} - Due: ${new Date(item.dueDateTime).toLocaleDateString()}`}
      left={props => <List.Icon {...props} icon="calendar-check" />}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d6efd" />
        <Text>Loading classrooms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {assignments.length > 0 && (
        <Card style={styles.assignmentsCard}>
          <Card.Title title="Upcoming Assignments" />
          <Card.Content>
            {loadingAssignments ? (
              <ActivityIndicator size="small" />
            ) : (
              <FlatList
                data={assignments}
                renderItem={renderAssignmentItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            )}
          </Card.Content>
        </Card>
      )}
      
      <View style={styles.classroomsHeader}>
        <Title>My Classrooms</Title>
        <Button 
          mode="text" 
          onPress={() => setShowJoinModal(true)}
          icon="plus"
        >
          Join Class
        </Button>
      </View>
      
      {classrooms.length > 0 ? (
        <FlatList
          data={classrooms}
          renderItem={renderClassroomCard}
          keyExtractor={(item) => item.ClassId}
          contentContainerStyle={styles.listContainer}
        />) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>ยังไม่มีห้องเรียน</Text>
            <Text style={styles.emptySubText}>เข้าร่วมห้องเรียนเพื่อเริ่มต้นการเรียนรู้</Text>
            <Button 
              mode="contained" 
              onPress={() => setShowJoinModal(true)}
              style={styles.joinButton}
              icon="plus"
            >
              เข้าร่วมห้องเรียน
            </Button>
          </View>
        )}
        
        <Modal
          visible={showJoinModal}
          onDismiss={() => setShowJoinModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Title style={styles.modalTitle}>เข้าร่วมห้องเรียน</Title>
          
          <TextInput
            label="รหัสห้องเรียน"
            value={classCode}
            onChangeText={setClassCode}
            style={styles.input}
          />
          
          <View style={styles.modalButtons}>
            <Button 
              onPress={() => setShowJoinModal(false)} 
              style={styles.modalButton}
            >
              ยกเลิก
            </Button>
            <Button 
              mode="contained" 
              onPress={handleJoinClass}
              loading={joiningClass}
              disabled={joiningClass}
              style={styles.modalButton}
            >
              เข้าร่วม
            </Button>
          </View>
        </Modal>
      </View>
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
    classroomsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    listContainer: {
      paddingBottom: 16,
    },
    card: {
      marginBottom: 16,
      elevation: 2,
    },
    cardFooter: {
      marginTop: 12,
    },
    teacherName: {
      color: '#666',
      fontSize: 12,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 16,
    },
    emptySubText: {
      color: '#666',
      marginTop: 8,
      marginBottom: 24,
      textAlign: 'center',
    },
    joinButton: {
      paddingHorizontal: 16,
    },
    modalContainer: {
      backgroundColor: 'white',
      padding: 20,
      margin: 20,
      borderRadius: 8,
    },
    modalTitle: {
      marginBottom: 16,
      textAlign: 'center',
    },
    input: {
      marginBottom: 16,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    modalButton: {
      marginLeft: 8,
    },
    assignmentsCard: {
      marginBottom: 24,
    },
  });