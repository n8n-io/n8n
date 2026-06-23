import type { IExecuteData, IExecuteFunctions, ITaskMetadata } from '../src/interfaces';
import { accumulateTokenUsage, parseErrorMetadata } from '../src/metadata-utils';

function createMockContext(metadata?: ITaskMetadata): IExecuteFunctions {
	const executeData: IExecuteData = {
		data: {},
		node: {} as IExecuteData['node'],
		source: null,
		metadata,
	};
	return {
		getExecuteData: () => executeData,
		setMetadata(newMetadata: ITaskMetadata) {
			executeData.metadata = { ...executeData.metadata, ...newMetadata };
		},
	} as unknown as IExecuteFunctions;
}

describe('MetadataUtils', () => {
	describe('accumulateTokenUsage', () => {
		it('should set token usage when no previous metadata exists', () => {
			const context = createMockContext();
			accumulateTokenUsage(context, 100, 50);
			expect(context.getExecuteData().metadata?.tokenUsage).toEqual({
				inputTokens: 100,
				outputTokens: 50,
			});
		});

		it('should accumulate tokens across multiple calls', () => {
			const context = createMockContext();
			accumulateTokenUsage(context, 100, 50);
			accumulateTokenUsage(context, 200, 80);
			accumulateTokenUsage(context, 50, 20);
			expect(context.getExecuteData().metadata?.tokenUsage).toEqual({
				inputTokens: 350,
				outputTokens: 150,
			});
		});

		it('should preserve existing metadata fields', () => {
			const context = createMockContext({ subExecutionsCount: 3 });
			accumulateTokenUsage(context, 100, 50);
			const metadata = context.getExecuteData().metadata;
			expect(metadata?.subExecutionsCount).toBe(3);
			expect(metadata?.tokenUsage).toEqual({ inputTokens: 100, outputTokens: 50 });
		});
	});

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
