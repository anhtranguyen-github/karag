
export const ILLEGAL_NAME_CHARS = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];

export const isFilenameValid = (name: string) => {
    return !ILLEGAL_NAME_CHARS.some(char => name.includes(char));
};

export const getIllegalCharsFound = (name: string) => {
    return ILLEGAL_NAME_CHARS.filter(char => name.includes(char));
};
export const PROVIDER_SETTING_KEYS = ['llm_provider', 'llm_model', 'embedding_provider', 'embedding_model'];
