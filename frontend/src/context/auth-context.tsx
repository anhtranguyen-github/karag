"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { User, Token, UserCreate } from "@/lib/api";

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
        const storedToken = localStorage.getItem("karag_token");
        if (storedToken) {
            setToken(storedToken);
            // In a real app, we'd fetch the user profile here
            // For now, we'll just assume they're authenticated if the token exists
            // and we'll let subsequent API calls fail if the token is invalid.
            setIsLoading(false);
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("username", email);
            formData.append("password", password);

            const tokenData = await api.loginAccessTokenAuthLoginPost({
                username: email,
                password: password
            });

            if (tokenData.accessToken) {
                localStorage.setItem("karag_token", tokenData.accessToken);
                setToken(tokenData.accessToken);
                // Redirect to home
                router.push("/");
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
            await api.registerAuthRegisterPost({ userCreate: data });
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
