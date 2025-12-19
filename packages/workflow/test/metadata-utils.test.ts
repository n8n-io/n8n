import { parseErrorMetadata } from '../src/metadata-utils';

describe('MetadataUtils', () => {
	describe('parseMetadataFromError', () => {
		const expectedMetadata = {
			subExecution: {
				executionId: '123',
				workflowId: '456',
			},
			subExecutionsCount: 1,
		};

		it('should return undefined if error does not have response or both keys on the object', () => {
			const error = { message: 'An error occurred' };
			const result = parseErrorMetadata(error);
			expect(result).toBeUndefined();
		});

		it('should return undefined if errorResponse only has workflowId key', () => {
			const error = { errorResponse: { executionId: '123' } };
			const result = parseErrorMetadata(error);
			expect(result).toBeUndefined();
		});

		it('should return undefined if error only has executionId key', () => {
			const error = { executionId: '123' };
			const result = parseErrorMetadata(error);
			expect(result).toBeUndefined();
		});

		it('should support executionId and workflowId key directly on the error object', () => {
			const error = { executionId: '123', workflowId: '456' };
			const result = parseErrorMetadata(error);
			expect(result).toEqual(expectedMetadata);
		});

		it('should return undefined if error response does not have subworkflow data', () => {
			const error = { errorResponse: { someKey: 'someValue' } };
			const result = parseErrorMetadata(error);
			expect(result).toBeUndefined();
		});

		it('should return metadata if error response has subworkflow data', () => {
			const error = { errorResponse: { executionId: '123', workflowId: '456' } };
			const result = parseErrorMetadata(error);
			expect(result).toEqual(expectedMetadata);
		});
	});
});
