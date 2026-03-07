import "./client";
import {
    registerApiV1AuthRegisterPost,
    loginAccessTokenApiV1AuthLoginPost,
    readUserMeApiV1AuthMeGet,
    type RegisterApiV1AuthRegisterPostData,
    type LoginAccessTokenApiV1AuthLoginPostData
} from "./generated";

export const auth = {
    register(data: RegisterApiV1AuthRegisterPostData | { body?: unknown; requestBody?: unknown } | Record<string, unknown>) {
        return registerApiV1AuthRegisterPost({
            body: (data as any)?.body ?? (data as any)?.requestBody ?? data,
        });
    },
    login(
        data:
            | LoginAccessTokenApiV1AuthLoginPostData
            | { body?: unknown; formData?: unknown; requestBody?: unknown }
            | Record<string, unknown>,
    ) {
        return loginAccessTokenApiV1AuthLoginPost({
            body: (data as any)?.body ?? (data as any)?.formData ?? (data as any)?.requestBody ?? data,
        });
    },
    me() {
        return readUserMeApiV1AuthMeGet();
    }
};
