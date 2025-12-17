"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Register user & save role to Firestore
    const register = async (email, password, name, role) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email,
                name,
                role, // 'rescue' or 'center'
                createdAt: new Date().toISOString(),
            });

            return user;
        } catch (error) {
            console.error("Registration Error:", error);
            throw error;
        }
    };

    // Login
    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    // Google Login with Auto-Role Assignment
    const loginWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                const adminEmails = ["admin@thaisave.com", "starnng@gmail.com"];
                const role = adminEmails.includes(user.email) ? "center" : "rescue";

                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName,
                    role: role,
                    createdAt: new Date().toISOString(),
                    photoURL: user.photoURL
                });

                setUser({ ...user, role });
            } else {
                setUser({ ...user, ...userDoc.data() });
            }

            return user;
        } catch (error) {
            console.error("Google Login Error:", error);
            throw error;
        }
    };

    const logout = () => {
        return signOut(auth);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    // Fetch user role from Firestore before setting loading to false
                    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (userDoc.exists()) {
                        setUser({ ...currentUser, ...userDoc.data() });
                    } else {
                        // Self-Healing: User exists in Auth but not in Firestore -> Create Profile
                        console.log("Self-Healing: Creating missing user profile for...", currentUser.email);

                        const adminEmails = ["admin@thaisave.com", "starnng@gmail.com"];
                        const role = adminEmails.includes(currentUser.email) ? "center" : "rescue";

                        const newProfile = {
                            uid: currentUser.uid,
                            email: currentUser.email,
                            name: currentUser.displayName || "User",
                            role: role,
                            createdAt: new Date().toISOString(),
                            photoURL: currentUser.photoURL
                        };

                        // Create the doc
                        await setDoc(doc(db, "users", currentUser.uid), newProfile);

                        // Set user with the new role
                        setUser({ ...currentUser, ...newProfile });
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setUser(currentUser);
                }
            } else {
                setUser(null);
            }
            // CRITICAL: Only set loading to false AFTER we have processed the user (or determined there is none)
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, register, login, loginWithGoogle, logout }}>
            {/* Don't render children until we know the auth state */}
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
