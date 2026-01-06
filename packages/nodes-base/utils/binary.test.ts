import { prepareBinariesDataList } from './binary';

describe('prepareBinariesDataList', () => {
	describe('string input', () => {
		it('should split comma-separated string with spaces', () => {
			const input = 'file1, file2, file3';
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['file1', 'file2', 'file3']);
		});

		it('should split comma-separated string without spaces', () => {
			const input = 'file1,file2,file3';
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['file1', 'file2', 'file3']);
		});

		it('should trim whitespace from property names', () => {
			const input = 'file1  ,  file2  ,  file3';
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['file1', 'file2', 'file3']);
		});

		it('should return single item as array', () => {
			const input = 'singleFile';
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['singleFile']);
		});

		it('should return array with empty string for empty input', () => {
			const input = '';
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['']);
		});

		it('should handle trailing comma', () => {
			const input = 'file1, file2,';
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['file1', 'file2', '']);
		});
	});

	describe('array input', () => {
		it('should return string array as-is', () => {
			const input = ['file1', 'file2', 'file3'];
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['file1', 'file2', 'file3']);
		});

		it('should return empty array as-is', () => {
			const input: string[] = [];
			const result = prepareBinariesDataList(input);
			expect(result).toEqual([]);
		});

		it('should return IBinaryData array as-is', () => {
			const input = [
				{ data: 'data1', mimeType: 'text/plain' },
				{ data: 'data2', mimeType: 'text/plain' },
			];
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(input);
		});

		it('should return IBinaryData array with multiple items', () => {
			const input = [
				{ data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' },
				{ data: 'data2', mimeType: 'image/png', fileName: 'file2.png' },
				{ data: 'data3', mimeType: 'application/pdf', fileName: 'file3.pdf' },
			];
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(input);
			expect(result).toHaveLength(3);
		});

		it('should return single-item IBinaryData array as-is', () => {
			const input = [{ data: 'data1', mimeType: 'text/plain', fileName: 'single.txt' }];
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(input);
			expect(result).toHaveLength(1);
		});
	});

	describe('object input', () => {
		it('should wrap single IBinaryData object in array', () => {
			const input = { data: 'data1', mimeType: 'text/plain' };
			const result = prepareBinariesDataList(input);
			expect(result).toEqual([input]);
		});

		it('should wrap IBinaryData object with fileName property in array', () => {
			const input = { data: 'data1', mimeType: 'text/plain', fileName: 'test.txt' };
			const result = prepareBinariesDataList(input);
			expect(result).toEqual([input]);
			expect(result).toHaveLength(1);
		});

		it('should wrap IBinaryData object with all properties in array', () => {
			const input = {
				data: 'base64data',
				mimeType: 'application/pdf',
				fileName: 'document.pdf',
				fileExtension: 'pdf',
			};
			const result = prepareBinariesDataList(input);
			expect(result).toEqual([input]);
			expect(result[0]).toMatchObject(input);
		});
	});
});
