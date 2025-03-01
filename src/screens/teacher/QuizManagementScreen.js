// src/screens/teacher/QuizManagementScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, StyleSheet, ScrollView, Alert, FlatList,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { 
  Card, Title, Paragraph, Button, FAB, Text, Divider,
  Dialog, Portal, TextInput, List, IconButton, Provider
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, query, where, getDocs, addDoc, updateDoc,
  deleteDoc, doc, getDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useUserAuth } from '../../context/UserAuthContext';

const QuizManagementScreen = ({ route, navigation }) => {
  const { classId } = route.params;
  const { user } = useUserAuth();
  
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizDescription, setNewQuizDescription] = useState('');
  const [newQuizTimeLimit, setNewQuizTimeLimit] = useState('10');
  const [quizStudentResults, setQuizStudentResults] = useState({});
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [studentsData, setStudentsData] = useState({});
  
  useEffect(() => {
    fetchQuizzes();
  }, [classId]);
  
  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      
      const quizzesQuery = query(
        collection(db, 'Quizzes'),
        where('classId', '==', classId),
        // orderBy('createdAt', 'desc')
      );
      
      const quizzesSnapshot = await getDocs(quizzesQuery);
      const quizzesData = quizzesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      for (const quiz of quizzesData) {
        // Get results for this quiz
        const resultsQuery = query(
          collection(db, 'QuizResults'),
          where('quizId', '==', quiz.id)
        );
        
        const resultsSnapshot = await getDocs(resultsQuery);
        quiz.totalAttempts = resultsSnapshot.size;
        
        if (resultsSnapshot.size > 0) {
          // Calculate average score
          let totalScore = 0;
          resultsSnapshot.docs.forEach(doc => {
            totalScore += doc.data().score;
          });
          quiz.averageScore = (totalScore / resultsSnapshot.size).toFixed(1);
        } else {
          quiz.averageScore = '-';
        }
      }
      
      setQuizzes(quizzesData);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      Alert.alert('Error', 'Failed to load quizzes. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateQuiz = async () => {
    if (!newQuizTitle.trim()) {
      Alert.alert('Error', 'Please enter a quiz title');
      return;
    }
    
    try {
      setLoading(true);
      
      const newQuiz = {
        title: newQuizTitle,
        description: newQuizDescription,
        classId,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        questions: [],
        timeLimit: parseInt(newQuizTimeLimit) || 10
      };
      
      const docRef = await addDoc(collection(db, 'Quizzes'), newQuiz);
      
      setShowCreateDialog(false);
      setNewQuizTitle('');
      setNewQuizDescription('');
      setNewQuizTimeLimit('10');
      
      navigation.navigate('EditQuiz', { quizId: docRef.id, classId });
    } catch (error) {
      console.error('Error creating quiz:', error);
      Alert.alert('Error', 'Failed to create quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditQuiz = (quiz) => {
    navigation.navigate('EditQuiz', { quizId: quiz.id, classId });
  };
  
  const handleDeleteQuiz = async (quiz) => {
    Alert.alert(
      'Delete Quiz',
      'Are you sure you want to delete this quiz? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Delete quiz
              await deleteDoc(doc(db, 'Quizzes', quiz.id));
              
              // Also delete all results for this quiz
              const resultsQuery = query(
                collection(db, 'QuizResults'),
                where('quizId', '==', quiz.id)
              );
              
              const resultsSnapshot = await getDocs(resultsQuery);
              
              const deletePromises = resultsSnapshot.docs.map(doc => 
                deleteDoc(doc.ref)
              );
              
              await Promise.all(deletePromises);
              
              Alert.alert('Success', 'Quiz deleted successfully');
              fetchQuizzes();
            } catch (error) {
              console.error('Error deleting quiz:', error);
              Alert.alert('Error', 'Failed to delete quiz. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const fetchQuizResults = async (quizId) => {
    try {
      // Get results for this quiz
      const resultsQuery = query(
        collection(db, 'QuizResults'),
        where('quizId', '==', quizId)
      );
      
      const resultsSnapshot = await getDocs(resultsQuery);
      const results = resultsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get student data for each result
      const studentIds = results.map(result => result.userId);
      
      // Only fetch student data that we don't already have
      const newStudentIds = studentIds.filter(id => !studentsData[id]);
      
      if (newStudentIds.length > 0) {
        const studentsPromises = newStudentIds.map(async (studentId) => {
          const studentDoc = await getDoc(doc(db, 'Students', studentId));
          if (studentDoc.exists()) {
            return { id: studentId, ...studentDoc.data() };
          }
          return null;
        });
        
        const newStudents = (await Promise.all(studentsPromises))
          .filter(Boolean)
          .reduce((acc, student) => {
            acc[student.id] = student;
            return acc;
          }, {});
        
        setStudentsData(prev => ({ ...prev, ...newStudents }));
      }
      
      return results;
    } catch (error) {
      console.error('Error fetching quiz results:', error);
      return [];
    }
  };
  
  const handleViewResults = async (quiz) => {
    try {
      setLoading(true);
      setSelectedQuiz(quiz);
      
      const results = await fetchQuizResults(quiz.id);
      setQuizStudentResults(results);
      
      setShowResultsDialog(true);
    } catch (error) {
      console.error('Error viewing results:', error);
      Alert.alert('Error', 'Failed to load quiz results. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const renderQuizCard = ({ item }) => (
    <Card style={styles.quizCard}>
      <Card.Content>
        <Title>{item.title}</Title>
        <Paragraph numberOfLines={2}>{item.description}</Paragraph>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Questions</Text>
            <Text style={styles.statValue}>{item.questions?.length || 0}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Attempts</Text>
            <Text style={styles.statValue}>{item.totalAttempts || 0}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg. Score</Text>
            <Text style={styles.statValue}>{item.averageScore}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>{item.timeLimit || 10} min</Text>
          </View>
        </View>
      </Card.Content>
      
      <Card.Actions>
        <Button 
          onPress={() => handleEditQuiz(item)}
          icon="pencil"
        >
          Edit
        </Button>
        
        <Button 
          onPress={() => handleViewResults(item)}
          icon="poll"
          disabled={!item.totalAttempts}
        >
          Results
        </Button>
        
        <Button 
          onPress={() => handleDeleteQuiz(item)}
          icon="delete"
          color="#F44336"
        >
          Delete
        </Button>
      </Card.Actions>
    </Card>
  );
  
  if (loading && quizzes.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d6efd" />
        <Text>Loading quizzes...</Text>
      </View>
    );
  }
  
  return (
    <Provider>
      <View style={styles.container}>
        <FlatList
          data={quizzes}
          renderItem={renderQuizCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Ionicons name="help-circle-outline" size={64} color="#ccc" style={styles.emptyIcon} />
                <Title style={styles.emptyTitle}>No Quizzes Yet</Title>
                <Paragraph style={styles.emptyText}>
                  Create your first quiz to assess your students' understanding.
                </Paragraph>
                <Button 
                  mode="contained" 
                  onPress={() => setShowCreateDialog(true)}
                  style={styles.createButton}
                  icon="plus"
                >
                  Create Quiz
                </Button>
              </Card.Content>
            </Card>
          )}
        />
        
        <FAB
          style={styles.fab}
          icon="plus"
          onPress={() => setShowCreateDialog(true)}
          visible={quizzes.length > 0}
        />
        
        <Portal>
          <Dialog visible={showCreateDialog} onDismiss={() => setShowCreateDialog(false)}>
            <Dialog.Title>Create New Quiz</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Quiz Title"
                value={newQuizTitle}
                onChangeText={setNewQuizTitle}
                style={styles.input}
              />
              
              <TextInput
                label="Description (Optional)"
                value={newQuizDescription}
                onChangeText={setNewQuizDescription}
                multiline
                numberOfLines={3}
                style={styles.input}
              />
              
              <TextInput
                label="Time Limit (minutes)"
                value={newQuizTimeLimit}
                onChangeText={setNewQuizTimeLimit}
                keyboardType="numeric"
                style={styles.input}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onPress={handleCreateQuiz}>Create</Button>
            </Dialog.Actions>
          </Dialog>
          
          <Dialog visible={showResultsDialog} onDismiss={() => setShowResultsDialog(false)}>
            <Dialog.Title>Quiz Results</Dialog.Title>
            <Dialog.Content>
              {quizStudentResults.length > 0 ? (
                <FlatList
                  data={quizStudentResults}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <List.Item
                      title={`${studentsData[item.userId]?.FirstName || 'Unknown'} ${studentsData[item.userId]?.LastName || 'Student'}`}
                      description={`Submitted: ${new Date(item.submittedAt?.toDate()).toLocaleString()}`}
                      right={() => (
                        <View style={styles.scoreContainer}>
                          <Text style={styles.scoreText}>
                            {item.score}/{item.totalQuestions}
                          </Text>
                          <Text style={styles.scorePercentage}>
                            {Math.round((item.score / item.totalQuestions) * 100)}%
                          </Text>
                        </View>
                      )}
                    />
                  )}
                  ItemSeparatorComponent={() => <Divider />}
                  style={styles.resultsList}
                />
              ) : (
                <Text>No results found for this quiz</Text>
              )}
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowResultsDialog(false)}>Close</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </Provider>
  );
};

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
  quizCard: {
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCard: {
    padding: 16,
    alignItems: 'center',
  },
  emptyIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  createButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#0d6efd',
  },
  input: {
    marginBottom: 12,
  },
  resultsList: {
    maxHeight: 400,
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scorePercentage: {
    fontSize: 12,
    color: '#666',
  },
});

export default QuizManagementScreen;