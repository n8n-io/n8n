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

		it.each([
			['undefined counts', undefined, undefined],
			['NaN counts', Number.NaN, Number.NaN],
			['negative counts', -350, -10],
			['infinite counts', Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
			['fractional counts', 1.5, 2.5],
			['non-number counts', '100' as unknown as number, null as unknown as number],
		])('should ignore unusable counts when both are invalid (%s)', (_label, input, output) => {
			const context = createMockContext();
			accumulateTokenUsage(context, input, output);
			expect(context.getExecuteData().metadata?.tokenUsage).toBeUndefined();
		});

		it('should ignore an unusable count on one side and still accumulate the valid side', () => {
			const context = createMockContext();
			accumulateTokenUsage(context, Number.NaN, 40);
			accumulateTokenUsage(context, 120, undefined);
			accumulateTokenUsage(context, -350, 15);
			expect(context.getExecuteData().metadata?.tokenUsage).toEqual({
				inputTokens: 120,
				outputTokens: 55,
			});
		});

		it('should not poison subsequent valid accumulations after an omitted or malformed response', () => {
			const context = createMockContext();
			accumulateTokenUsage(context, 100, 50);
			accumulateTokenUsage(context, undefined, undefined);
			accumulateTokenUsage(context, Number.NaN, Number.NaN);
			accumulateTokenUsage(context, -50, -20);
			accumulateTokenUsage(context, 200, 75);
			expect(context.getExecuteData().metadata?.tokenUsage).toEqual({
				inputTokens: 300,
				outputTokens: 125,
			});
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
