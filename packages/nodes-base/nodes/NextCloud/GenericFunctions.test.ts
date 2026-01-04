import { encodeWebDavPath } from './GenericFunctions';

describe('encodeWebDavPath', () => {
	it('should encode spaces in filename', () => {
		expect(encodeWebDavPath('/Photos/test photo.jpg')).toBe('/Photos/test%20photo.jpg');
	});

	it('should encode spaces in folder name', () => {
		expect(encodeWebDavPath('/My Documents/file.pdf')).toBe('/My%20Documents/file.pdf');
	});

	it('should encode multiple spaces', () => {
		expect(encodeWebDavPath('/My Files/my document 2024.pdf')).toBe(
			'/My%20Files/my%20document%202024.pdf',
		);
	});

	it('should handle path without spaces', () => {
		expect(encodeWebDavPath('/Documents/file.pdf')).toBe('/Documents/file.pdf');
	});

	it('should handle empty path', () => {
		expect(encodeWebDavPath('')).toBe('');
	});

	it('should handle root path', () => {
		expect(encodeWebDavPath('/')).toBe('/');
	});

	it('should encode special characters', () => {
		expect(encodeWebDavPath('/Files/report#2024.pdf')).toBe('/Files/report%232024.pdf');
	});

	it('should encode ampersand', () => {
		expect(encodeWebDavPath('/Files/Tom & Jerry.pdf')).toBe('/Files/Tom%20%26%20Jerry.pdf');
	});

	it('should preserve leading slash', () => {
		expect(encodeWebDavPath('/folder/file.txt')).toBe('/folder/file.txt');
	});

	it('should handle multiple consecutive slashes', () => {
		expect(encodeWebDavPath('//folder//file.txt')).toBe('//folder//file.txt');
	});

	it('should encode parentheses', () => {
		expect(encodeWebDavPath('/Files/document (1).pdf')).toBe('/Files/document%20(1).pdf');
	});

	it('should encode plus sign', () => {
		expect(encodeWebDavPath('/Files/file+name.pdf')).toBe('/Files/file%2Bname.pdf');
	});
});
