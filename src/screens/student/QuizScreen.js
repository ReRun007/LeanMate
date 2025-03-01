// src/screens/student/QuizScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, 
  useWindowDimensions, ActivityIndicator, BackHandler 
} from 'react-native';
import { 
  Card, Title, Text, Button, ProgressBar, RadioButton, 
  Paragraph, Dialog, Portal, Provider 
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useUserAuth } from '../../context/UserAuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { recordQuizAttempt } from '../../utils/attendanceUtils';

const QuizScreen = ({ route, navigation }) => {
  const { quizId, classId } = route.params;
  const { user } = useUserAuth();
  const { width } = useWindowDimensions();
  
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizResult, setQuizResult] = useState(null);

  useEffect(() => {
    fetchQuiz();
    
    // Prevent back button during quiz
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!quizSubmitted) {
          Alert.alert(
            'Quit Quiz?',
            'Your progress will be lost. Are you sure you want to quit?',
            [
              { text: 'Stay', style: 'cancel', onPress: () => {} },
              { text: 'Quit', style: 'destructive', onPress: () => navigation.goBack() }
            ]
          );
          return true;
        }
        return false;
      }
    );
    
    return () => backHandler.remove();
  }, [quizId]);

  // Timer for quiz
  useEffect(() => {
    let timer;
    if (quiz && quiz.timeLimit && !quizSubmitted) {
      const minutes = quiz.timeLimit;
      setTimeLeft(minutes * 60); // convert to seconds
      
      timer = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timer);
            handleSubmitQuiz();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [quiz, quizSubmitted]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const quizDoc = await getDoc(doc(db, 'Quizzes', quizId));
      
      if (!quizDoc.exists()) {
        Alert.alert('Error', 'Quiz not found');
        navigation.goBack();
        return;
      }
      
      const quizData = quizDoc.data();
      
      // Check if user already took this quiz
      const resultId = `${quizId}_${user.uid}`;
      const resultDoc = await getDoc(doc(db, 'QuizResults', resultId));
      
      if (resultDoc.exists()) {
        const resultData = resultDoc.data();
        setQuizSubmitted(true);
        setQuizResult(resultData);
        setScore(resultData.score);
        setAnswers(resultData.answers);
      }
      
      // Make sure questions have unique IDs
      if (quizData.questions) {
        quizData.questions = quizData.questions.map((q, index) => ({
          ...q,
          id: q.id || `q_${index}`
        }));
      }
      
      setQuiz(quizData);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      Alert.alert('Error', 'Failed to load quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    setAnswers({
      ...answers,
      [questionIndex]: optionIndex
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (quiz?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!user || !quiz) return;
    
    try {
      setLoading(true);
      
      // Calculate score
      let correctCount = 0;
      (quiz.questions || []).forEach((question, index) => {
        if (answers[index] === question.correctAnswer) {
          correctCount++;
        }
      });
      
      const totalScore = correctCount;
      setScore(totalScore);
      
      // Save result to Firestore
      const resultId = `${quizId}_${user.uid}`;
      await setDoc(doc(db, 'QuizResults', resultId), {
        quizId,
        userId: user.uid,
        classId,
        answers,
        score: totalScore,
        totalQuestions: quiz.questions?.length || 0,
        submittedAt: new Date()
      });
      
      // Record attendance
      await recordQuizAttempt(user.uid, classId, quizId);
      
      setQuizSubmitted(true);
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      Alert.alert('Error', 'Failed to submit quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const renderQuestion = () => {
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      return (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>No questions available</Text>
          </Card.Content>
        </Card>
      );
    }
    
    const question = quiz.questions[currentQuestionIndex];
    
    return (
      <Card style={styles.questionCard}>
        <Card.Content>
          <Title style={styles.questionText}>
            Question {currentQuestionIndex + 1}: {question.text}
          </Title>
          
          {question.image && (
            <Image 
              source={{ uri: question.image }} 
              style={[styles.questionImage, { width: width - 64 }]} 
              resizeMode="contain" 
            />
          )}
          
          {question.options.map((option, optionIndex) => {
            const isSelected = answers[currentQuestionIndex] === optionIndex;
            const isCorrect = quizSubmitted && optionIndex === question.correctAnswer;
            const isIncorrect = quizSubmitted && isSelected && !isCorrect;
            
            return (
              <TouchableOpacity 
                key={optionIndex}
                style={[
                  styles.optionContainer,
                  isSelected && styles.selectedOption,
                  quizSubmitted && isCorrect && styles.correctOption,
                  isIncorrect && styles.incorrectOption
                ]}
                onPress={() => !quizSubmitted && handleAnswerSelect(currentQuestionIndex, optionIndex)}
                disabled={quizSubmitted}
              >
                <RadioButton
                  value={optionIndex.toString()}
                  status={isSelected ? 'checked' : 'unchecked'}
                  onPress={() => !quizSubmitted && handleAnswerSelect(currentQuestionIndex, optionIndex)}
                  disabled={quizSubmitted}
                />
                
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionText}>
                    {typeof option === 'string' ? option : option.text}
                  </Text>
                  
                  {typeof option !== 'string' && option.image && (
                    <Image 
                      source={{ uri: option.image }} 
                      style={[styles.optionImage, { width: width - 100 }]} 
                      resizeMode="contain" 
                    />
                  )}
                </View>
                
                {quizSubmitted && (
                  isCorrect ? (
                    <Ionicons name="checkmark-circle" size={24} color="green" />
                  ) : (
                    isIncorrect && <Ionicons name="close-circle" size={24} color="red" />
                  )
                )}
              </TouchableOpacity>
            );
          })}
        </Card.Content>
      </Card>
    );
  };

  const renderQuizResult = () => {
    if (!quiz || !quizSubmitted) return null;
    
    const totalQuestions = quiz.questions?.length || 0;
    const percentage = (score / totalQuestions) * 100;
    
    return (
      <Card style={styles.resultCard}>
        <Card.Content>
          <Title style={styles.resultTitle}>Quiz Results</Title>
          
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>
              {score} / {totalQuestions}
            </Text>
            <Text style={styles.percentageText}>
              {percentage.toFixed(0)}%
            </Text>
          </View>
          
          <ProgressBar 
            progress={percentage / 100} 
            color={percentage >= 70 ? '#4CAF50' : percentage >= 40 ? '#FF9800' : '#F44336'} 
            style={styles.progressBar} 
          />
          
          <Text style={styles.feedbackText}>
            {percentage >= 70 
              ? 'Great job! You have a good understanding of this topic.' 
              : percentage >= 40 
                ? 'Good effort! Keep studying to improve your score.' 
                : 'You might need more practice with this topic.'}
          </Text>
          
          <Text style={styles.reviewText}>
            Review your answers by navigating through the questions above.
          </Text>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d6efd" />
        <Text>Loading quiz...</Text>
      </View>
    );
  }

  return (
    <Provider>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.headerCard}>
            <Card.Content>
              <Title>{quiz?.title}</Title>
              <Paragraph>{quiz?.description}</Paragraph>
              
              {!quizSubmitted && timeLeft !== null && (
                <View style={styles.timerContainer}>
                  <Ionicons name="time-outline" size={20} color="#0d6efd" />
                  <Text style={styles.timerText}>Time left: {formatTime(timeLeft)}</Text>
                </View>
              )}
              
              <ProgressBar 
                progress={(currentQuestionIndex + 1) / (quiz?.questions?.length || 1)} 
                color={'#0d6efd'} 
                style={styles.progressBar} 
              />
              
              <Text style={styles.progressText}>
                Question {currentQuestionIndex + 1} of {quiz?.questions?.length || 0}
              </Text>
            </Card.Content>
          </Card>
          
          {renderQuestion()}
          
          {quizSubmitted && renderQuizResult()}
          
          <View style={styles.buttonsContainer}>
            <Button 
              mode="outlined" 
              onPress={handlePreviousQuestion}
              icon="arrow-left"
              disabled={currentQuestionIndex === 0}
              style={styles.navigationButton}
            >
              Previous
            </Button>
            
            {currentQuestionIndex === (quiz?.questions?.length || 0) - 1 ? (
              quizSubmitted ? (
                <Button 
                  mode="contained" 
                  onPress={() => navigation.goBack()}
                  icon="check"
                  style={styles.navigationButton}
                >
                  Finish
                </Button>
              ) : (
                <Button 
                  mode="contained" 
                  onPress={() => setShowConfirmDialog(true)}
                  icon="send"
                  style={styles.navigationButton}
                >
                  Submit
                </Button>
              )
            ) : (
              <Button 
                mode="contained" 
                onPress={handleNextQuestion}
                icon="arrow-right"
                style={styles.navigationButton}
              >
                Next
              </Button>
            )}
          </View>
        </ScrollView>
        
        <Portal>
          <Dialog visible={showConfirmDialog} onDismiss={() => setShowConfirmDialog(false)}>
            <Dialog.Title>Submit Quiz</Dialog.Title>
            <Dialog.Content>
              <Paragraph>Are you sure you want to submit your answers?</Paragraph>
              <Paragraph>
                You have answered {Object.keys(answers).length} out of {quiz?.questions?.length || 0} questions.
              </Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowConfirmDialog(false)}>Cancel</Button>
              <Button onPress={handleSubmitQuiz}>Submit</Button>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    marginBottom: 16,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  timerText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d6efd',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
  questionCard: {
    marginBottom: 16,
  },
  questionText: {
    fontSize: 18,
    marginBottom: 16,
  },
  questionImage: {
    height: 200,
    marginBottom: 16,
    borderRadius: 8,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedOption: {
    borderColor: '#0d6efd',
    backgroundColor: '#f0f7ff',
  },
  correctOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  incorrectOption: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  optionText: {
    fontSize: 16,
  },
  optionImage: {
    height: 120,
    marginTop: 8,
    borderRadius: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  navigationButton: {
    minWidth: 120,
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
  resultCard: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  resultTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  percentageText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 8,
  },
  feedbackText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  reviewText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default QuizScreen;