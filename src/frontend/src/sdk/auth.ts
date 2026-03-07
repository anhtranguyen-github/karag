import {
    registerApiV1AuthRegisterPost,
    loginAccessTokenApiV1AuthLoginPost,
    readUserMeApiV1AuthMeGet,
    type RegisterApiV1AuthRegisterPostData,
    type LoginAccessTokenApiV1AuthLoginPostData
} from "./generated";

export const auth = {
    register(data: RegisterApiV1AuthRegisterPostData) {
        return registerApiV1AuthRegisterPost(data);
    },
    login(data: LoginAccessTokenApiV1AuthLoginPostData) {
        return loginAccessTokenApiV1AuthLoginPost(data);
    },
    me() {
        return readUserMeApiV1AuthMeGet();
    }
};
