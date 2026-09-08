export const setFilename = (preparedBinaryData, requestOptions, responseFileName) => {
    if (!preparedBinaryData.fileName &&
        preparedBinaryData.fileExtension &&
        typeof requestOptions.uri === 'string' &&
        requestOptions.uri.endsWith(preparedBinaryData.fileExtension)) {
        return requestOptions.uri.split('/').pop();
    }
    if (!preparedBinaryData.fileName && preparedBinaryData.fileExtension) {
        return `${responseFileName ?? 'data'}.${preparedBinaryData.fileExtension}`;
    }
    return preparedBinaryData.fileName;
};
//# sourceMappingURL=binaryData.js.map