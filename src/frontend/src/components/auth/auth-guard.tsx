"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { buildLoginRedirectUrl, resolvePostLoginRedirect } from "@/lib/auth-redirect";

/** Routes that don't require authentication */
const PUBLIC_ROUTES = ["/login", "/register"];

/**
 * AuthGuard wraps children and handles all redirect logic:
 *  - Unauthenticated users on protected pages → /login
 *  - Authenticated users on /login or /register → /
 *  - Shows a loading spinner while auth state is being resolved
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
    const currentSearch = searchParams.toString();
    const nextTarget = searchParams.get("next");

    useEffect(() => {
        if (isLoading) return;

        if (!isAuthenticated && !isPublicRoute) {
            router.replace(buildLoginRedirectUrl(pathname, currentSearch ? `?${currentSearch}` : ""));
        }

        if (isAuthenticated && isPublicRoute) {
            router.replace(resolvePostLoginRedirect(nextTarget));
        }
    }, [currentSearch, isAuthenticated, isLoading, isPublicRoute, nextTarget, pathname, router]);

    // While loading, show a centered spinner
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                        Loading…
                    </span>
                </div>
            </div>
        );
    }

    // Prevent flash of protected content before redirect kicks in
    if (!isAuthenticated && !isPublicRoute) {
        return null;
    }

    // Prevent flash of login page for authenticated users
    if (isAuthenticated && isPublicRoute) {
        return null;
    }

    return <>{children}</>;
}
