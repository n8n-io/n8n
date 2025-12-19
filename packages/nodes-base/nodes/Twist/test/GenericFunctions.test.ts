import type { IBinaryData } from 'n8n-workflow';
import { prepareBinariesDataList } from '../GenericFunctions';

describe('Twist GenericFunctions', () => {
	describe('prepareBinariesDataList', () => {
		describe('Array inputs', () => {
			it('should return string array as is', () => {
				const input = ['file1', 'file2', 'file3'];
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file1', 'file2', 'file3']);
			});

			it('should return IBinaryData array as is', () => {
				const input: IBinaryData[] = [
					{ data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' },
					{ data: 'data2', mimeType: 'text/plain', fileName: 'file2.txt' },
				];
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(input);
				expect(result).toBe(input); // Should be the same reference
			});

			it('should return empty array as is', () => {
				const input: string[] = [];
				const result = prepareBinariesDataList(input);
				expect(result).toEqual([]);
			});
		});

		describe('Object inputs', () => {
			it('should wrap single IBinaryData object in array', () => {
				const input: IBinaryData = {
					data: 'base64data',
					mimeType: 'image/png',
					fileName: 'image.png',
				};
				const result = prepareBinariesDataList(input);
				expect(result).toEqual([input]);
				expect(Array.isArray(result)).toBe(true);
				expect(result.length).toBe(1);
			});

			it('should wrap IBinaryData with minimal properties in array', () => {
				const input: IBinaryData = {
					data: 'data',
					mimeType: 'application/octet-stream',
				};
				const result = prepareBinariesDataList(input);
				expect(result).toEqual([input]);
			});

			it('should wrap IBinaryData with all properties in array', () => {
				const input: IBinaryData = {
					data: 'data',
					mimeType: 'application/pdf',
					fileName: 'document.pdf',
					fileExtension: 'pdf',
					directory: '/tmp',
					fileSize: '1024',
				};
				const result = prepareBinariesDataList(input);
				expect(result).toEqual([input]);
			});
		});

		describe('String inputs', () => {
			it('should split comma-separated string and trim values', () => {
				const input = 'file1, file2, file3';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file1', 'file2', 'file3']);
			});

			it('should split comma-separated string without spaces', () => {
				const input = 'file1,file2,file3';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file1', 'file2', 'file3']);
			});

			it('should handle string with multiple spaces around commas', () => {
				const input = 'file1  ,   file2   ,  file3';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file1', 'file2', 'file3']);
			});

			it('should handle single string value', () => {
				const input = 'singlefile';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['singlefile']);
			});

			it('should handle empty string', () => {
				const input = '';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['']);
			});

			it('should handle string with trailing comma', () => {
				const input = 'file1,file2,';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file1', 'file2', '']);
			});

			it('should handle string with leading comma', () => {
				const input = ',file1,file2';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['', 'file1', 'file2']);
			});

			it('should handle string with consecutive commas', () => {
				const input = 'file1,,file2';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file1', '', 'file2']);
			});

			it('should trim whitespace from individual items', () => {
				const input = '  file1  ,  file2  ,  file3  ';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file1', 'file2', 'file3']);
			});

			it('should handle string with special characters', () => {
				const input = 'file-1.txt, file_2.png, file@3.pdf';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['file-1.txt', 'file_2.png', 'file@3.pdf']);
			});

			it('should handle string with paths', () => {
				const input = '/path/to/file1, /another/path/file2';
				const result = prepareBinariesDataList(input);
				expect(result).toEqual(['/path/to/file1', '/another/path/file2']);
			});
		});
	});
});
