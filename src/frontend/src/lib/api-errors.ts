export interface ParsedApiError {
    message: string;
    details?: string;
    code?: string;
    status?: number;
}

const stringifyDetails = (value: unknown): string | undefined => {
    if (typeof value === "string") {
        return value;
    }

    if (value == null) {
        return undefined;
    }

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

export const isApiStatus = (error: unknown, statuses: number[]) => {
    const status = (error as any)?.response?.status ?? (error as any)?.status;
    return typeof status === "number" && statuses.includes(status);
};

export const unwrapApiPayload = <T,>(payload: any): T => {
    if (payload?.error) {
        throw payload.error;
    }

    return (payload?.data?.data ?? payload?.data ?? payload) as T;
};

export const parseApiError = async (error: any, fallbackMessage: string): Promise<ParsedApiError> => {
    const status = error?.response?.status ?? error?.status;
    const directMessage =
        error?.message ??
        error?.error?.message ??
        error?.detail?.message ??
        (typeof error?.detail === "string" ? error.detail : undefined);
    const directCode = error?.code ?? error?.error?.code ?? error?.detail?.code;
    const directDetails =
        stringifyDetails(error?.detail?.params) ??
        stringifyDetails(error?.error?.details) ??
        stringifyDetails(error?.details);

    if (directMessage && directMessage !== "Request failed") {
        return {
            message: directMessage,
            details: directDetails,
            code: directCode,
            status,
        };
    }

    if (error?.response && typeof error.response.json === "function") {
        try {
            const payload = await error.response.json();
            return {
                message:
                    payload?.message ??
                    payload?.detail?.message ??
                    (typeof payload?.detail === "string" ? payload.detail : undefined) ??
                    fallbackMessage,
                details:
                    stringifyDetails(payload?.detail?.params) ??
                    stringifyDetails(payload?.data) ??
                    directDetails,
                code: payload?.code ?? payload?.detail?.code ?? directCode,
                status,
            };
        } catch {
            // Fall through to the generic fallback below.
        }
    }

    return {
        message: fallbackMessage,
        details: directDetails,
        code: directCode,
        status,
    };
};
