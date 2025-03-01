// src/screens/student/StudentClassroomDetailsScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Text, ActivityIndicator, Button } from 'react-native-paper';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useUserAuth } from '../../context/UserAuthContext';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function StudentClassroomDetailsScreen({ route, navigation }) {
  const { classId } = route.params;
  const { user } = useUserAuth();
  const [classroom, setClassroom] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [posts, setPosts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'posts', title: 'Posts', icon: 'comment' },
    { key: 'lessons', title: 'Lessons', icon: 'book' },
    { key: 'quizzes', title: 'Quizzes', icon: 'help-circle' },
    { key: 'assignments', title: 'Assignments', icon: 'clipboard' },
  ]);

  useEffect(() => {
    fetchClassroomData();
    fetchPosts();
    fetchAssignments();
    fetchQuizzes();
    fetchLessons();
  }, [classId]);

  const fetchClassroomData = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, "Classrooms", classId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const classData = docSnap.data();
        setClassroom(classData);

        // Fetch teacher data
        const teacherId = classData.TeachersID.split('/')[2];
        const teacherRef = doc(db, "Teachers", teacherId);
        const teacherSnap = await getDoc(teacherRef);

        if (teacherSnap.exists()) {
          setTeacher(teacherSnap.data());
        }
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

  const fetchPosts = async () => {
    try {
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
    }
  };

  const fetchAssignments = async () => {
    try {
      const assignmentsQuery = query(
        collection(db, "Assignments"),
        where("classId", "==", classId),
        orderBy("dueDateTime")
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const assignmentsData = assignmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Check which assignments the student has submitted
      const submissionsQuery = query(
        collection(db, "Submissions"),
        where("classId", "==", classId),
        where("studentId", "==", user.uid)
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const submittedAssignments = submissionsSnapshot.docs.map(doc => doc.data().assignmentId);

      // Add submission status to assignments
      const assignmentsWithStatus = assignmentsData.map(assignment => ({
        ...assignment,
        submitted: submittedAssignments.includes(assignment.id),
      }));

      setAssignments(assignmentsWithStatus);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const quizzesQuery = query(
        collection(db, "Quizzes"),
        where("classId", "==", classId)
      );
      const quizzesSnapshot = await getDocs(quizzesQuery);
      const quizzesData = quizzesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Check which quizzes the student has taken
      const resultsQuery = query(
        collection(db, "QuizResults"),
        where("userId", "==", user.uid)
      );
      const resultsSnapshot = await getDocs(resultsQuery);
      const takenQuizzes = resultsSnapshot.docs.map(doc => doc.data().quizId);

      // Add submission status to quizzes
      const quizzesWithStatus = quizzesData.map(quiz => ({
        ...quiz,
        taken: takenQuizzes.includes(quiz.id),
      }));

      setQuizzes(quizzesWithStatus);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    }
  };

  const fetchLessons = async () => {
    try {
      const lessonsQuery = query(
        collection(db, "Lessons"),
        where("classId", "==", classId),
        orderBy("order")
      );
      const lessonsSnapshot = await getDocs(lessonsQuery);
      const lessonsData = lessonsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setLessons(lessonsData);
    } catch (error) {
      console.error("Error fetching lessons:", error);
    }
  };

  const handleLessonPress = (lesson) => {
    navigation.navigate('LessonDetail', { lesson, classId });
  };

  const handleQuizPress = (quiz) => {
    navigation.navigate('Quiz', { quizId: quiz.id, classId });
  };

  const handleAssignmentPress = (assignment) => {
    navigation.navigate('Assignment', { assignment, classId });
  };

  const renderPostsTab = () => (
    <ScrollView style={styles.tabContent}>
      {posts.length > 0 ? (
        posts.map(post => (
          <Card key={post.id} style={styles.card}>
            <Card.Content>
              <Paragraph>{post.content}</Paragraph>
              <Text style={styles.postDate}>
                {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : 'Unknown date'}
              </Text>
            </Card.Content>
          </Card>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>No posts yet</Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );

  const renderLessonsTab = () => (
    <ScrollView style={styles.tabContent}>
      {lessons.length > 0 ? (
        lessons.map(lesson => (
          <TouchableOpacity key={lesson.id} onPress={() => handleLessonPress(lesson)}>
            <Card style={styles.card}>
              <Card.Content>
                <Title>{lesson.title}</Title>
                <Paragraph numberOfLines={2}>{lesson.description}</Paragraph>
                <View style={styles.cardFooter}>
                  <Ionicons name="book" size={16} color="#0d6efd" />
                  <Text style={styles.footerText}>Tap to view</Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>No lessons available</Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );

  const renderQuizzesTab = () => (
    <ScrollView style={styles.tabContent}>
      {quizzes.length > 0 ? (
        quizzes.map(quiz => (
          <TouchableOpacity key={quiz.id} onPress={() => handleQuizPress(quiz)}>
            <Card style={styles.card}>
              <Card.Content>
                <Title>{quiz.title}</Title>
                <Paragraph numberOfLines={2}>{quiz.description}</Paragraph>
                <View style={styles.cardFooter}>
                  {quiz.taken ? (
                    <View style={styles.statusContainer}>
                      <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                      <Text style={[styles.footerText, styles.completedText]}>Completed</Text>
                    </View>
                  ) : (
                    <View style={styles.statusContainer}>
                      <Ionicons name="help-circle" size={16} color="#0d6efd" />
                      <Text style={styles.footerText}>Take Quiz</Text>
                    </View>
                  )}
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>No quizzes available</Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );

  const renderAssignmentsTab = () => (
    <ScrollView style={styles.tabContent}>
      {assignments.length > 0 ? (
        assignments.map(assignment => (
          <TouchableOpacity key={assignment.id} onPress={() => handleAssignmentPress(assignment)}>
            <Card style={styles.card}>
              <Card.Content>
                <Title>{assignment.title}</Title>
                <Paragraph numberOfLines={2}>{assignment.description}</Paragraph>
                <Text style={styles.dueDate}>
                  Due: {new Date(assignment.dueDateTime).toLocaleString()}
                </Text>
                <View style={styles.cardFooter}>
                  {assignment.submitted ? (
                    <View style={styles.statusContainer}>
                      <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                      <Text style={[styles.footerText, styles.completedText]}>Submitted</Text>
                    </View>
                  ) : (
                    <View style={styles.statusContainer}>
                      <Ionicons name="create" size={16} color="#0d6efd" />
                      <Text style={styles.footerText}>Submit Assignment</Text>
                    </View>
                  )}
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>No assignments available</Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
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
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title>{classroom?.ClassName}</Title>
          <Paragraph>{classroom?.ClassDescription}</Paragraph>
          {teacher && (
            <Text style={styles.teacherText}>
              Teacher: {teacher.FirstName} {teacher.LastName}
            </Text>
          )}
        </Card.Content>
      </Card>

      <TabView
        navigationState={{ index, routes }}
        renderScene={SceneMap({
          posts: renderPostsTab,
          lessons: renderLessonsTab,
          quizzes: renderQuizzesTab,
          assignments: renderAssignmentsTab,
        })}
        onIndexChange={setIndex}
        renderTabBar={props => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: '#0d6efd' }}
            style={{ backgroundColor: 'white' }}
            activeColor="#0d6efd"
            inactiveColor="#666"
            renderIcon={({ route, focused, color }) => (
              <Ionicons name={route.icon} size={20} color={color} />
            )}
          />
        )}
      />

      {/* {activeTab === 0 && renderPostsTab()}
      {activeTab === 1 && renderLessonsTab()}
      {activeTab === 2 && renderQuizzesTab()}
      {activeTab === 3 && renderAssignmentsTab()} */}
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
    marginBottom: 8,
  },
  teacherText: {
    marginTop: 8,
    fontStyle: 'italic',
  },
  tabs: {
    backgroundColor: 'white',
  },
  tabContent: {
    flex: 1,
    padding: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 16,
  },
  emptyCard: {
    marginBottom: 16,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  postDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#0d6efd',
  },
  completedText: {
    color: '#28a745',
  },
  dueDate: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 8,
  },
});