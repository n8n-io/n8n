import { mimeTypeFromResponse } from '../../V3/utils/parse';

describe('mimeTypeFromResponse', () => {
	it('should return undefined if input is undefined', () => {
		expect(mimeTypeFromResponse(undefined)).toBeUndefined();
	});

	it('should return the mime type for a simple type', () => {
		expect(mimeTypeFromResponse('image/png')).toBe('image/png');
	});

	it('should strip charset from content type', () => {
		expect(mimeTypeFromResponse('text/html; charset=utf-8')).toBe('text/html');
	});

	it('should strip charset from content type', () => {
		expect(mimeTypeFromResponse('text/plain; charset=utf-8')).toBe('text/plain');
	});

	it('should strip boundary from multipart content type', () => {
		expect(mimeTypeFromResponse('multipart/form-data; boundary=ExampleBoundaryString')).toBe(
			'multipart/form-data',
		);
	});

	it('should handle content type with extra spaces', () => {
		expect(mimeTypeFromResponse('application/json ; charset=utf-8')).toBe('application/json');
	});

	it('should handle content type with space before semicolon', () => {
		expect(mimeTypeFromResponse('application/xml ;charset=utf-8')).toBe('application/xml');
	});
});
