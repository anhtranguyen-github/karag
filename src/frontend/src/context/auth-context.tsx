"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User, UserCreate } from "@/sdk/generated";
import { auth } from "@/sdk/auth";
import { configureApi } from "@/lib/api-client";
import { parseApiError, unwrapApiPayload } from "@/lib/api-errors";
import { AUTH_TOKEN_COOKIE } from "@/lib/auth-redirect";

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

const persistAuthToken = (token: string | null) => {
    if (typeof document === "undefined") {
        return;
    }

    if (!token) {
        document.cookie = `${AUTH_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
        return;
    }

    document.cookie = `${AUTH_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const logout = useCallback(() => {
        localStorage.removeItem("karag_token");
        persistAuthToken(null);
        configureApi(null);
        setToken(null);
        setUser(null);
        setIsLoading(false);
        router.push("/login");
    }, [router]);

    const clearInvalidSession = useCallback(() => {
        localStorage.removeItem("karag_token");
        persistAuthToken(null);
        configureApi(null);
        setToken(null);
        setUser(null);
    }, []);

    useEffect(() => {
        const fetchUser = async () => {
            const storedToken = localStorage.getItem("karag_token");
            if (storedToken) {
                persistAuthToken(storedToken);
                configureApi(storedToken);
                setToken(storedToken);
                try {
                    const profile = unwrapApiPayload<User>(await auth.me());
                    setUser(profile);
                } catch (error) {
                    console.error("Failed to fetch user profile:", error);
                    clearInvalidSession();
                }
            }
            setIsLoading(false);
        };
        fetchUser();
    }, [clearInvalidSession]);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const tokenData = unwrapApiPayload<{ access_token: string; token_type: string }>(await auth.login({
                formData: {
                    username: email,
                    password: password
                }
            }));

            localStorage.setItem("karag_token", tokenData.access_token);
            persistAuthToken(tokenData.access_token);
            configureApi(tokenData.access_token);
            setToken(tokenData.access_token);
            // Fetch user profile after login
            try {
                const profile = unwrapApiPayload<User>(await auth.me());
                setUser(profile);
            } catch {
                // Profile fetch is optional at login time
            }
        } catch (error) {
            const parsed = await parseApiError(error, "Login failed. Please check your credentials.");
            console.error("Login failed:", parsed);
            throw new Error(parsed.message);
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
            const parsed = await parseApiError(error, "Registration failed.");
            console.error("Registration failed:", parsed);
            throw new Error(parsed.message);
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
