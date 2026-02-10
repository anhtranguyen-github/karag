
export const ILLEGAL_NAME_CHARS = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];

export const isFilenameValid = (name: string) => {
    return !ILLEGAL_NAME_CHARS.some(char => name.includes(char));
};

export const getIllegalCharsFound = (name: string) => {
    return ILLEGAL_NAME_CHARS.filter(char => name.includes(char));
};
