// src/context/UserAuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut 
} from "firebase/auth";
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const userAuthContext = createContext();

export function UserAuthContextProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userType, setUserType] = useState(null);
    const [loading, setLoading] = useState(true);

    function logIn(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function signUp(email, password) {
        return createUserWithEmailAndPassword(auth, email, password);
    }

    function logOut() {
        return signOut(auth);
    }

    const checkUserType = async (uid) => {
        try {
            const teacherDocRef = doc(db, "Teachers", uid);
            const studentDocRef = doc(db, "Students", uid);

            const [teacherDocSnap, studentDocSnap] = await Promise.all([
                getDoc(teacherDocRef),
                getDoc(studentDocRef)
            ]);

            if (teacherDocSnap.exists()) {
                await AsyncStorage.setItem('userType', 'teacher');
                await AsyncStorage.setItem('teacherId', uid);
                return 'teacher';
            } else if (studentDocSnap.exists()) {
                await AsyncStorage.setItem('userType', 'student');
                await AsyncStorage.setItem('studentId', uid);
                return 'student';
            }
            return null;
        } catch (error) {
            console.error("Error in checkUserType:", error);
            throw error;
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            console.log("Auth state changed", currentUser);
            
            if (currentUser) {
                setUser(currentUser);
                try {
                    const userTypeResult = await checkUserType(currentUser.uid);
                    setUserType(userTypeResult);
                } catch (error) {
                    console.error("Error checking user type:", error);
                }
            } else {
                setUser(null);
                setUserType(null);
                await AsyncStorage.removeItem('userType');
                await AsyncStorage.removeItem('teacherId');
                await AsyncStorage.removeItem('studentId');
            }
            
            setLoading(false);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return (
        <userAuthContext.Provider value={{ user, userType, loading, logIn, signUp, logOut, checkUserType }}>
            {children}
        </userAuthContext.Provider>
    );
}

export function useUserAuth() {
    return useContext(userAuthContext);
}