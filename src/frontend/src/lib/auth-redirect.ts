const DEFAULT_AUTH_REDIRECT = "/dashboard";

export const buildNextTarget = (pathname: string, search?: string | null) => {
    const query = search && search.length > 0 ? search : "";
    const target = `${pathname}${query}`;
    return isSafeNextTarget(target) ? target : DEFAULT_AUTH_REDIRECT;
};

export const isSafeNextTarget = (value: string | null | undefined) => {
    if (!value) {
        return false;
    }

    if (!value.startsWith("/") || value.startsWith("//")) {
        return false;
    }

    if (value.includes("://") || value.startsWith("/\\") || value.includes("\\") || value.includes("\0")) {
        return false;
    }

    return true;
};

export const resolvePostLoginRedirect = (nextValue: string | null | undefined): string =>
    isSafeNextTarget(nextValue) ? (nextValue as string) : DEFAULT_AUTH_REDIRECT;

export const buildLoginRedirectUrl = (pathname: string, search?: string | null) => {
    const next = buildNextTarget(pathname, search);
    return `/login?next=${encodeURIComponent(next)}`;
};

export const AUTH_TOKEN_COOKIE = "karag_token";
export const DEFAULT_LOGIN_REDIRECT = DEFAULT_AUTH_REDIRECT;
