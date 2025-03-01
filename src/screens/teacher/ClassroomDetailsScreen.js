// src/screens/teacher/ClassroomDetailsScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { 
  Card, Title, Paragraph, Button, Text, ActivityIndicator, 
  Divider, List, FAB, Modal, TextInput, Chip, Menu
} from 'react-native-paper';
import { useUserAuth } from '../../context/UserAuthContext';
import { 
  collection, query, where, getDocs, doc, getDoc, 
  updateDoc, addDoc, orderBy, deleteDoc 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function ClassroomDetailsScreen({ route, navigation }) {
  const { classId, classroomName } = route.params;
  const { user } = useUserAuth();
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showStudentList, setShowStudentList] = useState(false);
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    fetchClassroomData();
    fetchStudents();
    fetchPosts();
  }, [classId]);
  
  const fetchClassroomData = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, "Classrooms", classId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setClassroom(docSnap.data());
      } else {
        Alert.alert('Error', 'Classroom not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error fetching classroom:", error);
      Alert.alert('Error', 'Failed to load classroom details');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      
      // Get enrollments
      const enrollmentsQuery = query(
        collection(db, "ClassEnrollments"),
        where("classId", "==", classId)
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      const studentIds = enrollmentsSnapshot.docs.map(doc => doc.data().studentId);
      
      if (studentIds.length > 0) {
        // Get student details
        const studentsData = await Promise.all(
          studentIds.map(async (studentId) => {
            const studentRef = doc(db, "Students", studentId);
            const studentSnap = await getDoc(studentRef);
            
            if (studentSnap.exists()) {
              return {
                id: studentId,
                ...studentSnap.data()
              };
            }
            return null;
          })
        );
        
        setStudents(studentsData.filter(Boolean));
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };
  
  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      
      const postsQuery = query(
        collection(db, "Posts"),
        where("classId", "==", classId),
        orderBy("createdAt", "desc")
      );
      const postsSnapshot = await getDocs(postsQuery);
      const postsData = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setPosts(postsData);
    } catch (error) {
      console.error("Error fetching posts:", error);
      Alert.alert('Error', 'Failed to load posts');
    } finally {
      setLoadingPosts(false);
    }
  };
  
  const handleCreatePost = async () => {
    if (!postContent.trim()) {
      Alert.alert('Error', 'Please enter post content');
      return;
    }
    
    try {
      const newPost = {
        content: postContent,
        classId: classId,
        createdAt: new Date(),
        createdBy: user.uid
      };
      
      await addDoc(collection(db, "Posts"), newPost);
      
      setShowAddPostModal(false);
      setPostContent('');
      fetchPosts();
      
      Alert.alert('Success', 'Post created successfully');
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert('Error', 'Failed to create post');
    }
  };
  
  const openMenu = (event) => {
    const { nativeEvent } = event;
    setMenuPosition({
      x: nativeEvent.pageX,
      y: nativeEvent.pageY,
    });
    setShowMenu(true);
  };
  
  const handleRemoveStudent = async (studentId) => {
    try {
      const enrollmentQuery = query(
        collection(db, "ClassEnrollments"),
        where("studentId", "==", studentId),
        where("classId", "==", classId)
      );
      const enrollmentSnapshot = await getDocs(enrollmentQuery);
      
      if (!enrollmentSnapshot.empty) {
        await deleteDoc(enrollmentSnapshot.docs[0].ref);
        
        setStudents(prevStudents => 
          prevStudents.filter(student => student.id !== studentId)
        );
        
        Alert.alert('Success', 'Student removed successfully');
      }
    } catch (error) {
      console.error("Error removing student:", error);
      Alert.alert('Error', 'Failed to remove student');
    }
  };
  
  const renderPost = (post, index) => (
    <Card key={post.id} style={styles.postCard}>
      <Card.Content>
        <Paragraph>{post.content}</Paragraph>
        <Text style={styles.postDate}>
          {post.createdAt.toDate ? post.createdAt.toDate().toLocaleString() : 'Unknown date'}
        </Text>
      </Card.Content>
    </Card>
  );
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d6efd" />
        <Text>Loading classroom...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <ScrollView>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title>{classroom?.ClassName}</Title>
            <Paragraph>{classroom?.ClassDescription || 'No description'}</Paragraph>
            
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Class Code:</Text>
              <Chip icon="key" mode="outlined" style={styles.codeChip}>{classroom?.ClassId}</Chip>
            </View>
            
            <View style={styles.statsContainer}>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => setShowStudentList(true)}
              >
                <Ionicons name="people" size={20} color="#0d6efd" />
                <Text style={styles.statText}>{students.length} Students</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('Lessons', { classId })}
              >
                <Ionicons name="book" size={20} color="#0d6efd" />
                <Text style={styles.statText}>Lessons</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('QuizManagement', { classId })}
              >
                <Ionicons name="help-circle" size={20} color="#0d6efd" />
                <Text style={styles.statText}>Quizzes</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
        
        <View style={styles.sectionHeader}>
          <Title>Recent Posts</Title>
          <Button 
            mode="text" 
            onPress={() => setShowAddPostModal(true)}
            icon="plus"
          >
            New Post
          </Button>
        </View>
        
        {loadingPosts ? (
          <ActivityIndicator size="small" style={styles.loadingPosts} />
        ) : posts.length > 0 ? (
          posts.map(renderPost)
        ) : (
          <Card style={styles.emptyPostsCard}>
            <Card.Content>
              <Text style={styles.emptyText}>No posts yet</Text>
              <Text style={styles.emptySubText}>Create your first post to share with your students</Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => openMenu({ nativeEvent: { pageX: 0, pageY: 0 } })}
      />
      
      <Menu
        visible={showMenu}
        onDismiss={() => setShowMenu(false)}
        anchor={menuPosition}
      >
        <Menu.Item 
          icon="post" 
          onPress={() => {
            setShowMenu(false);
            setShowAddPostModal(true);
          }} 
          title="Create Post" 
        />
        <Menu.Item 
          icon="book" 
          onPress={() => {
            setShowMenu(false);
            navigation.navigate('Lessons', { classId });
          }} 
          title="Manage Lessons" 
        />
        <Menu.Item 
          icon="help-circle" 
          onPress={() => {
            setShowMenu(false);
            navigation.navigate('Quizzes', { classId });
          }} 
          title="Manage Quizzes" 
        />
      </Menu>
      
      <Modal
        visible={showAddPostModal}
        onDismiss={() => setShowAddPostModal(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Title style={styles.modalTitle}>Create New Post</Title>
        
        <TextInput
          label="Content"
          value={postContent}
          onChangeText={setPostContent}
          multiline
          numberOfLines={5}
          style={styles.postInput}
        />
        
        <View style={styles.modalButtons}>
          <Button 
            onPress={() => setShowAddPostModal(false)} 
            style={styles.modalButton}
          >
            Cancel
          </Button>
          <Button 
            mode="contained" 
            onPress={handleCreatePost}
            style={styles.modalButton}
          >
            Post
          </Button>
        </View>
      </Modal>
      
      <Modal
        visible={showStudentList}
        onDismiss={() => setShowStudentList(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Title style={styles.modalTitle}>Students</Title>
        
        {loadingStudents ? (
          <ActivityIndicator size="small" />
        ) : students.length > 0 ? (
          students.map(student => (
            <List.Item
              key={student.id}
              title={`${student.FirstName} ${student.LastName}`}
              description={student.Email}
              left={props => <List.Icon {...props} icon="account" />}
              right={props => (
                <Button
                  {...props}
                  icon="close"
                  mode="text"
                  onPress={() => handleRemoveStudent(student.id)}
                  style={styles.removeButton}
                />
              )}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>No students enrolled</Text>
        )}
        
        <Button 
          mode="outlined" 
          onPress={() => setShowStudentList(false)}
          style={styles.closeButton}
        >
          Close
        </Button>
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
  headerCard: {
    margin: 16,
    elevation: 2,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  codeLabel: {
    marginRight: 8,
  },
  codeChip: {
    height: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  statText: {
    marginLeft: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  postCard: {
    margin: 16,
    marginTop: 8,
  },
  postDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  emptyPostsCard: {
    margin: 16,
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  emptySubText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#0d6efd',
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
  postInput: {
    marginBottom: 16,
    height: 120,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    marginLeft: 8,
  },
  removeButton: {
    marginRight: -8,
  },
  closeButton: {
    marginTop: 16,
  },
  loadingPosts: {
    marginTop: 16,
  },
});