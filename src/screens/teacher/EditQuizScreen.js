// src/screens/teacher/EditQuizScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, 
  useWindowDimensions, ActivityIndicator 
} from 'react-native';
import { 
  Card, Title, Paragraph, Button, TextInput, FAB, Text, 
  Portal, Dialog, RadioButton, Provider, Divider 
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';

const EditQuizScreen = ({ route, navigation }) => {
  const { quizId, classId } = route.params;
  const { width } = useWindowDimensions();
  
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState({
    text: '',
    options: [{ text: '' }, { text: '' }],
    correctAnswer: 0,
    image: null
  });
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  useEffect(() => {
    fetchQuiz();
  }, [quizId]);
  
  useEffect(() => {
    // Set up edit mode in navigation
    navigation.setOptions({
      title: quiz?.title || 'Edit Quiz',
      headerRight: () => (
        <Button 
          mode="text" 
          onPress={handleSave}
          loading={saving}
          disabled={saving}
        >
          Save
        </Button>
      )
    });
  }, [quiz, saving]);
  
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
      
      // Make sure questions have IDs
      if (quizData.questions) {
        quizData.questions = quizData.questions.map((q, index) => ({
          ...q,
          id: q.id || `question_${index}`
        }));
      } else {
        quizData.questions = [];
      }
      
      setQuiz(quizData);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      Alert.alert('Error', 'Failed to load quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    try {
      setSaving(true);
      await updateDoc(doc(db, 'Quizzes', quizId), {
        questions: quiz.questions || []
      });
      Alert.alert('Success', 'Quiz saved successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving quiz:', error);
      Alert.alert('Error', 'Failed to save quiz. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleAddQuestion = () => {
    setEditMode('add');
    setCurrentQuestion({
      id: `question_${Date.now()}`,
      text: '',
      options: [{ text: '' }, { text: '' }],
      correctAnswer: 0,
      image: null
    });
    setShowQuestionDialog(true);
  };
  
  const handleEditQuestion = (index) => {
    setEditMode('edit');
    setEditIndex(index);
    setCurrentQuestion({
      ...quiz.questions[index]
    });
    setShowQuestionDialog(true);
  };
  
  const handleDeleteQuestion = (index) => {
    Alert.alert(
      'Delete Question',
      'Are you sure you want to delete this question?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            const newQuestions = [...quiz.questions];
            newQuestions.splice(index, 1);
            setQuiz({
              ...quiz,
              questions: newQuestions
            });
          }
        }
      ]
    );
  };
  
  const handleSaveQuestion = () => {
    // Validate
    if (!currentQuestion.text.trim()) {
      Alert.alert('Error', 'Please enter question text');
      return;
    }
    
    if (currentQuestion.options.some(opt => !opt.text.trim())) {
      Alert.alert('Error', 'Please fill in all option texts');
      return;
    }
    
    const newQuestions = [...(quiz.questions || [])];
    
    if (editMode === 'add') {
      newQuestions.push(currentQuestion);
    } else if (editMode === 'edit' && editIndex !== null) {
      newQuestions[editIndex] = currentQuestion;
    }
    
    setQuiz({
      ...quiz,
      questions: newQuestions
    });
    
    setShowQuestionDialog(false);
  };
  
  const handleAddOption = () => {
    if (currentQuestion.options.length < 4) {
      setCurrentQuestion({
        ...currentQuestion,
        options: [...currentQuestion.options, { text: '' }]
      });
    }
  };
  
  const handleRemoveOption = (index) => {
    if (currentQuestion.options.length > 2) {
      const newOptions = [...currentQuestion.options];
      newOptions.splice(index, 1);
      
      // Adjust correctAnswer if needed
      let correctAnswer = currentQuestion.correctAnswer;
      if (correctAnswer === index) {
        correctAnswer = 0;
      } else if (correctAnswer > index) {
        correctAnswer--;
      }
      
      setCurrentQuestion({
        ...currentQuestion,
        options: newOptions,
        correctAnswer
      });
    }
  };
  
  const handleOptionChange = (index, text) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = { ...newOptions[index], text };
    
    setCurrentQuestion({
      ...currentQuestion,
      options: newOptions
    });
  };
  
  const handleImagePick = async (type, optionIndex = null) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant camera roll permissions to upload images');
      return;
    }
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });
      
      if (!result.canceled) {
        setUploading(true);
        
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const storageRef = ref(storage, `quizzes/${classId}/${quizId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
        await uploadBytes(storageRef, blob);
        
        const imageUrl = await getDownloadURL(storageRef);
        
        if (type === 'question') {
          setCurrentQuestion({
            ...currentQuestion,
            image: imageUrl
          });
        } else if (type === 'option' && optionIndex !== null) {
          const newOptions = [...currentQuestion.options];
          newOptions[optionIndex] = { 
            ...newOptions[optionIndex], 
            image: imageUrl 
          };
          
          setCurrentQuestion({
            ...currentQuestion,
            options: newOptions
          });
        }
        
        setUploading(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
      setUploading(false);
    }
  };
  
  const renderQuestionCard = (question, index) => (
    <Card key={question.id} style={styles.questionCard}>
      <Card.Content>
        <View style={styles.questionHeader}>
          <Title style={styles.questionNumber}>Question {index + 1}</Title>
          <View style={styles.questionActions}>
            <Button 
              icon="pencil" 
              mode="text"
              onPress={() => handleEditQuestion(index)}
              style={styles.actionButton}
            >
              Edit
            </Button>
            <Button 
              icon="delete" 
              mode="text"
              color="#F44336"
              onPress={() => handleDeleteQuestion(index)}
              style={styles.actionButton}
            >
              Delete
            </Button>
          </View>
        </View>
        
        <Text style={styles.questionText}>{question.text}</Text>
        
        {question.image && (
          <Image 
            source={{ uri: question.image }} 
            style={[styles.questionImage, { width: width - 64 }]} 
            resizeMode="contain" 
          />
        )}
        
        <Divider style={styles.divider} />
        
        <Text style={styles.optionsHeader}>Options:</Text>
        
        {question.options.map((option, optionIndex) => (
          <View key={optionIndex} style={styles.optionItem}>
            <RadioButton
              value={optionIndex.toString()}
              status={optionIndex === question.correctAnswer ? 'checked' : 'unchecked'}
              disabled
            />
            <View style={styles.optionContent}>
              <Text style={optionIndex === question.correctAnswer ? styles.correctOption : styles.optionText}>
                {option.text}
              </Text>
              
              {option.image && (
                <Image 
                  source={{ uri: option.image }} 
                  style={styles.optionImage} 
                  resizeMode="contain" 
                />
              )}
            </View>
          </View>
        ))}
      </Card.Content>
    </Card>
  );
  
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
          <Card style={styles.quizInfoCard}>
            <Card.Content>
              <Title>{quiz?.title}</Title>
              <Paragraph>{quiz?.description}</Paragraph>
              <Text>
                Time limit: {quiz?.timeLimit || 10} minutes • {quiz?.questions?.length || 0} questions
              </Text>
            </Card.Content>
          </Card>
          
          {quiz?.questions?.map(renderQuestionCard)}
          
          {quiz?.questions?.length === 0 && (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Ionicons name="help-circle-outline" size={64} color="#ccc" style={styles.emptyIcon} />
                <Title style={styles.emptyTitle}>No Questions Yet</Title>
                <Paragraph style={styles.emptyText}>
                  Add your first question to get started.
                </Paragraph>
                <Button 
                  mode="contained" 
                  onPress={handleAddQuestion}
                  style={styles.addButton}
                  icon="plus"
                >
                  Add Question
                </Button>
              </Card.Content>
            </Card>
          )}
        </ScrollView>
        
        <FAB
          style={styles.fab}
          icon="plus"
          onPress={handleAddQuestion}
          visible={quiz?.questions?.length > 0}
        />
        
        <Portal>
          <Dialog 
            visible={showQuestionDialog} 
            onDismiss={() => setShowQuestionDialog(false)}
            style={styles.questionDialog}
          >
            <Dialog.Title>
              {editMode === 'add' ? 'Add Question' : 'Edit Question'}
            </Dialog.Title>
            <Dialog.ScrollArea style={styles.dialogScrollArea}>
              <ScrollView>
                <View style={styles.dialogContent}>
                  <TextInput
                    label="Question Text"
                    value={currentQuestion.text}
                    onChangeText={(text) => setCurrentQuestion({...currentQuestion, text})}
                    style={styles.input}
                    multiline
                  />
                  
                  <Button 
                    icon="image" 
                    mode="outlined" 
                    onPress={() => handleImagePick('question')}
                    style={styles.imageButton}
                    loading={uploading}
                    disabled={uploading}
                  >
                    {currentQuestion.image ? 'Change Question Image' : 'Add Question Image'}
                  </Button>
                  
                  {currentQuestion.image && (
                    <Image 
                      source={{ uri: currentQuestion.image }} 
                      style={styles.previewImage} 
                      resizeMode="contain" 
                    />
                  )}
                  
                  <Text style={styles.optionsLabel}>Answer Options:</Text>
                  
                  {currentQuestion.options.map((option, index) => (
                    <View key={index} style={styles.optionContainer}>
                      <View style={styles.optionHeader}>
                        <RadioButton
                          value={index.toString()}
                          status={currentQuestion.correctAnswer === index ? 'checked' : 'unchecked'}
                          onPress={() => setCurrentQuestion({...currentQuestion, correctAnswer: index})}
                        />
                        <Text style={styles.correctAnswerText}>
                          {currentQuestion.correctAnswer === index ? 'Correct Answer' : `Option ${index + 1}`}
                        </Text>
                        
                        {index > 1 && (
                          <Button 
                            icon="close" 
                            size={20} 
                            onPress={() => handleRemoveOption(index)}
                            style={styles.removeOptionButton}
                          />
                        )}
                      </View>
                      
                      <TextInput
                        value={option.text}
                        onChangeText={(text) => handleOptionChange(index, text)}
                        placeholder={`Option ${index + 1}`}
                        style={styles.optionInput}
                      />
                      
                      <Button 
                        icon="image" 
                        mode="outlined" 
                        onPress={() => handleImagePick('option', index)}
                        style={styles.optionImageButton}
                        compact
                      >
                        {option.image ? 'Change Image' : 'Add Image'}
                      </Button>
                      
                      {option.image && (
                        <Image 
                          source={{ uri: option.image }} 
                          style={styles.optionPreview} 
                          resizeMode="contain" 
                        />
                      )}
                    </View>
                  ))}
                  
                  {currentQuestion.options.length < 4 && (
                    <Button 
                      icon="plus" 
                      mode="outlined" 
                      onPress={handleAddOption}
                      style={styles.addOptionButton}
                    >
                      Add Option
                    </Button>
                  )}
                </View>
              </ScrollView>
            </Dialog.ScrollArea>
            <Dialog.Actions>
              <Button onPress={() => setShowQuestionDialog(false)}>Cancel</Button>
              <Button onPress={handleSaveQuestion}>Save</Button>
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
    paddingBottom: 80, // Space for FAB
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizInfoCard: {
    marginBottom: 16,
  },
  questionCard: {
    marginBottom: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionNumber: {
    fontSize: 18,
  },
  questionActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 8,
  },
  questionText: {
    fontSize: 16,
    marginBottom: 12,
  },
  questionImage: {
    height: 150,
    marginVertical: 8,
    borderRadius: 8,
  },
  divider: {
    marginVertical: 12,
  },
  optionsHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionContent: {
    flex: 1,
    marginLeft: 8,
  },
  optionText: {
    fontSize: 14,
  },
  correctOption: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  optionImage: {
    width: '100%',
    height: 100,
    marginTop: 8,
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#0d6efd',
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
  addButton: {
    padding: 8,
  },
  questionDialog: {
    maxHeight: '90%',
  },
  dialogScrollArea: {
    paddingHorizontal: 0,
  },
  dialogContent: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  imageButton: {
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 150,
    marginBottom: 16,
    borderRadius: 8,
  },
  optionsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 4,
  },
  optionContainer: {
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  correctAnswerText: {
    flex: 1,
    fontWeight: 'bold',
  },
  removeOptionButton: {
    margin: -8,
  },
  optionInput: {
    marginBottom: 8,
  },
  optionImageButton: {
    marginBottom: 8,
  },
  optionPreview: {
    width: '100%',
    height: 100,
    borderRadius: 4,
  },
  addOptionButton: {
    marginTop: 8,
    marginBottom: 16,
  },
});

export default EditQuizScreen;