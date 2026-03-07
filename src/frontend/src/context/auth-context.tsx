"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User, UserCreate } from "@/sdk/generated";
import { auth } from "@/sdk/auth";

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: UserCreate) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const logout = useCallback(() => {
        localStorage.removeItem("karag_token");
        setToken(null);
        setUser(null);
        setIsLoading(false);
        router.push("/login");
    }, [router]);

    useEffect(() => {
        const fetchUser = async () => {
            const storedToken = localStorage.getItem("karag_token");
            if (storedToken) {
                setToken(storedToken);
                try {
                    const profile = (await auth.me()) as any;
                    setUser(profile);
                } catch (error) {
                    console.error("Failed to fetch user profile:", error);
                    logout();
                }
            }
            setIsLoading(false);
        };
        fetchUser();
    }, [logout]);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const tokenData = (await auth.login({
                formData: {
                    username: email,
                    password: password
                }
            })) as any;

            localStorage.setItem("karag_token", tokenData.access_token);
            setToken(tokenData.access_token);
            // Fetch user profile after login
            try {
                const profile = (await auth.me()) as any;
                setUser(profile);
            } catch {
                // Profile fetch is optional at login time
            }
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (data: UserCreate) => {
        setIsLoading(true);
        try {
            (await auth.register({ requestBody: data })) as any;
            // After registration, user needs to login
            router.push("/login");
        } catch (error) {
            console.error("Registration failed:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
