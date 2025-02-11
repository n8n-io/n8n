import { parseErrorMetadata } from '@/MetadataUtils';

describe('MetadataUtils', () => {
	describe('parseMetadataFromError', () => {
		it('should return undefined if error does not have response', () => {
			const error = { message: 'An error occurred' };
			const result = parseErrorMetadata(error);
			expect(result).toBeUndefined();
		});

		it('should return undefined if error response does not have subworkflow data', () => {
			const error = { errorResponse: { someKey: 'someValue' } };
			const result = parseErrorMetadata(error);
			expect(result).toBeUndefined();
		});

		it('should return metadata if error response has subworkflow data', () => {
			const error = { errorResponse: { executionId: '123', workflowId: '456' } };
			const expectedMetadata = {
				subExecution: {
					executionId: '123',
					workflowId: '456',
				},
				subExecutionsCount: 1,
			};
			const result = parseErrorMetadata(error);
			expect(result).toEqual(expectedMetadata);
		});
	});
});
