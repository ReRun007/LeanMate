// src/screens/teacher/TeacherHomeScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, FAB, Text, ActivityIndicator, Modal, TextInput } from 'react-native-paper';
import { useUserAuth } from '../../context/UserAuthContext';
import { collection, query, where, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function TeacherHomeScreen({ navigation }) {
  const { user } = useUserAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const q = query(
        collection(db, "Classrooms"),
        where("TeachersID", "==", `/Teachers/${user.uid}`)
      );
      const querySnapshot = await getDocs(q);
      const classroomsData = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const classroom = doc.data();
          
          // Get count of students in this classroom
          const enrollmentsQuery = query(
            collection(db, "ClassEnrollments"),
            where("classId", "==", classroom.ClassId)
          );
          const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
          const studentCount = enrollmentsSnapshot.size;
          
          return { 
            ...classroom, 
            id: doc.id,
            studentCount 
          };
        })
      );
      
      setClassrooms(classroomsData);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      Alert.alert('Error', 'Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  };

  const generateClassId = async () => {
    let classId;
    let isUnique = false;
    
    while (!isUnique) {
      classId = `${Math.random().toString(36).substring(2, 5).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
      const q = query(collection(db, 'Classrooms'), where('ClassId', '==', classId));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        isUnique = true;
      }
    }
    
    return classId;
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      Alert.alert('Error', 'Please enter a class name');
      return;
    }
    
    try {
      setCreatingClass(true);
      const classId = await generateClassId();
      
      const docRef = doc(db, 'Classrooms', classId);
      await setDoc(docRef, {
        ClassId: classId,
        ClassName: newClassName,
        ClassDescription: newClassDescription,
        TeachersID: `/Teachers/${user.uid}`,
        CreatedAt: Timestamp.now()
      });
      
      setShowAddModal(false);
      setNewClassName('');
      setNewClassDescription('');
      
      Alert.alert('Success', 'Classroom created successfully');
      fetchClassrooms();
    } catch (error) {
      console.error("Error creating classroom:", error);
      Alert.alert('Error', 'Failed to create classroom');
    } finally {
      setCreatingClass(false);
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
            <View style={styles.statContainer}>
              <Ionicons name="people" size={16} color="#666" />
              <Text style={styles.statText}>{item.studentCount || 0} students</Text>
            </View>
            
            <View style={styles.statContainer}>
              <Ionicons name="key" size={16} color="#666" />
              <Text style={styles.statText}>Code: {item.ClassId}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
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
      {classrooms.length > 0 ? (
        <FlatList
          data={classrooms}
          renderItem={renderClassroomCard}
          keyExtractor={(item) => item.ClassId}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="school-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No classrooms yet</Text>
          <Text style={styles.emptySubText}>Create your first classroom to get started</Text>
          <Button 
            mode="contained" 
            onPress={() => setShowAddModal(true)}
            style={styles.createButton}
            icon="plus"
          >
            Create Classroom
          </Button>
        </View>
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowAddModal(true)}
        visible={classrooms.length > 0}
      />
      
      <Modal
        visible={showAddModal}
        onDismiss={() => setShowAddModal(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Title style={styles.modalTitle}>Create New Classroom</Title>
        
        <TextInput
          label="Classroom Name"
          value={newClassName}
          onChangeText={setNewClassName}
          style={styles.input}
        />
        
        <TextInput
          label="Description (Optional)"
          value={newClassDescription}
          onChangeText={setNewClassDescription}
          multiline
          numberOfLines={3}
          style={styles.input}
        />
        
        <View style={styles.modalButtons}>
          <Button 
            onPress={() => setShowAddModal(false)} 
            style={styles.modalButton}
          >
            Cancel
          </Button>
          <Button 
            mode="contained" 
            onPress={handleCreateClass}
            loading={creatingClass}
            disabled={creatingClass}
            style={styles.modalButton}
          >
            Create
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  statContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#0d6efd',
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
  createButton: {
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
});