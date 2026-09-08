import { setFilename } from '../../V3/utils/binaryData';
describe('setFilename', () => {
    it('returns filename from URI if fileName is missing and URI ends with fileExtension', () => {
        const preparedBinaryData = { fileExtension: 'png' };
        const requestOptions = { uri: 'https://example.com/image.png' };
        expect(setFilename(preparedBinaryData, requestOptions, undefined)).toBe('image.png');
    });
    it('returns constructed filename if fileName is missing and URI does not end with fileExtension', () => {
        const preparedBinaryData = { fileExtension: 'jpg' };
        const requestOptions = { uri: 'https://example.com/image.png' };
        expect(setFilename(preparedBinaryData, requestOptions, 'response')).toBe('response.jpg');
    });
    it('returns constructed filename with default "data" if responseFileName is undefined', () => {
        const preparedBinaryData = { fileExtension: 'txt' };
        const requestOptions = { uri: 'https://example.com/file' };
        expect(setFilename(preparedBinaryData, requestOptions, undefined)).toBe('data.txt');
    });
    it('returns fileName if it exists', () => {
        const preparedBinaryData = { fileName: 'myfile.pdf', fileExtension: 'pdf' };
        const requestOptions = { uri: 'https://example.com/file.pdf' };
        expect(setFilename(preparedBinaryData, requestOptions, 'response')).toBe('myfile.pdf');
    });
});
//# sourceMappingURL=binaryData.test.js.map