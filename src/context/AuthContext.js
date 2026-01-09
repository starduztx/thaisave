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
                const adminEmails = [
                    "kittithatchaichana@gmail.com",
                    "thanachai.bo2546@gmail.com",
                    "starnng@gmail.com",
                ];
                const role = adminEmails.includes(user.email) ? "center" : "pending";

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
                    const adminEmails = [
                        "kittithatchaichana@gmail.com",
                        "thanachai.bo2546@gmail.com",
                        "starnng@gmail.com"
                    ];

                    const userRef = doc(db, "users", currentUser.uid);
                    const userDoc = await getDoc(userRef);

                    if (userDoc.exists()) {
                        let userData = userDoc.data();

                        // Try to find email from ANY source (Auth, Firestore, Provider) to ensure we don't miss admins
                        const providerEmail = currentUser.providerData?.[0]?.email;
                        const finalEmail = (currentUser.email || providerEmail || userData.email)?.toLowerCase();
                        const isAdminEmail = adminEmails.includes(finalEmail);

                        // Force Upgrade check: If user is in whitelist but NOT center, fix it.
                        if (isAdminEmail && userData.role !== 'center') {
                            console.log("Auto-Upgrading Admin Role for:", finalEmail);
                            await setDoc(userRef, { role: 'center' }, { merge: true });
                            userData.role = 'center';
                        }

                        // Fix for bad state: If user has 'no-email' but role is 'pending', change to 'victim'
                        if (userData.email === 'no-email' && userData.role === 'pending') {
                            console.log("Auto-Fixing Anonymous Role from Pending to Victim");
                            await setDoc(userRef, { role: 'victim' }, { merge: true });
                            userData.role = 'victim';
                        }

                        // If we found a missing email, save it back to Firestore to fix the data
                        if (finalEmail && !userData.email) {
                            await setDoc(userRef, { email: finalEmail }, { merge: true });
                        }

                        // Explicitly construct user object to avoid spread issues with Firebase objects
                        setUser({
                            uid: currentUser.uid,
                            email: finalEmail,
                            displayName: currentUser.displayName || userData.name,
                            photoURL: currentUser.photoURL || userData.photoURL,
                            photoURL: currentUser.photoURL || userData.photoURL,
                            role: userData.role,
                            isAnonymous: currentUser.isAnonymous,
                            ...userData
                        });
                    } else {
                        // Self-Healing: User exists in Auth but not in Firestore -> Create Profile
                        console.log("Self-Healing: Creating missing user profile for...", currentUser.email);

                        const providerEmail = currentUser.providerData?.[0]?.email;
                        const finalEmail = (currentUser.email || providerEmail)?.toLowerCase();

                        const role = adminEmails.includes(finalEmail) ? "center" : (!finalEmail ? "victim" : "pending");

                        const newProfile = {
                            uid: currentUser.uid,
                            email: finalEmail || "no-email",
                            name: currentUser.displayName || "User",
                            role: role,
                            createdAt: new Date().toISOString(),
                            photoURL: currentUser.photoURL
                        };

                        await setDoc(userRef, newProfile);
                        setUser({
                            uid: currentUser.uid,
                            email: finalEmail,
                            displayName: currentUser.displayName,
                            photoURL: currentUser.photoURL,
                            photoURL: currentUser.photoURL,
                            role: role,
                            isAnonymous: currentUser.isAnonymous,
                            ...newProfile
                        });
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setUser(currentUser);
                }
            } else {
                setUser(null);
            }
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