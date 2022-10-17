export const deepCopy = <T>(toCopy: T) => JSON.parse(JSON.stringify(toCopy)) as T;
