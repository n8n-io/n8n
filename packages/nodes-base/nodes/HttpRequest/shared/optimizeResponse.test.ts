import { type IExecuteFunctions, NodeOperationError } from 'n8n-workflow';

import { configureResponseOptimizer } from './optimizeResponse';

describe('configureResponseOptimizer', () => {
	const mockCtx = {
		getNodeParameter: jest.fn(),
		getNode: jest.fn(),
	} as unknown as jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return the original response when optimizeResponse is false', () => {
		mockCtx.getNodeParameter.mockImplementation((param) => {
			if (param === 'optimizeResponse') return false;
		});

		const optimizer = configureResponseOptimizer(mockCtx, 0);
		const response = { key: 'value' };

		expect(optimizer(response)).toBe(response);
	});

	describe('htmlOptimizer', () => {
		it('should optimize HTML response based on CSS selector', () => {
			mockCtx.getNodeParameter.mockImplementation((param) => {
				if (param === 'optimizeResponse') return true;
				if (param === 'responseType') return 'html';
				if (param === 'cssSelector') return 'div';
				if (param === 'onlyContent') return false;
			});

			const optimizer = configureResponseOptimizer(mockCtx, 0);
			const response = '<div>Hello</div><div>World</div>';

			expect(optimizer(response)).toEqual('[\n  "Hello",\n  "World"\n]');
		});
	});

	describe('textOptimizer', () => {
		it('should extract readable text from HTML response', () => {
			mockCtx.getNodeParameter.mockImplementation((param) => {
				if (param === 'optimizeResponse') return true;
				if (param === 'responseType') return 'text';
			});

			const optimizer = configureResponseOptimizer(mockCtx, 0);
			const response = '<html><body><h1>Title</h1><p>Content</p></body></html>';

			expect(optimizer(response)).toContain('Title');
			expect(optimizer(response)).toContain('Content');
		});

		it('should truncate text if maxLength is set', () => {
			mockCtx.getNodeParameter.mockImplementation((param) => {
				if (param === 'optimizeResponse') return true;
				if (param === 'responseType') return 'text';
				if (param === 'truncateResponse') return true;
				if (param === 'maxLength') return 5;
			});

			const optimizer = configureResponseOptimizer(mockCtx, 0);
			const response = '<html><body><p>Content</p></body></html>';

			expect(optimizer(response)).toEqual('Conte');
		});
	});

	describe('jsonOptimizer', () => {
		it('should parse JSON response and include all fields by default', () => {
			mockCtx.getNodeParameter.mockImplementation((param) => {
				if (param === 'optimizeResponse') return true;
				if (param === 'responseType') return 'json';
				if (param === 'fieldsToInclude') return 'all';
			});

			const optimizer = configureResponseOptimizer(mockCtx, 0);
			const response = '{"key": "value"}';

			expect(optimizer(response)).toEqual([{ key: 'value' }]);
		});

		it('should include only selected fields', () => {
			mockCtx.getNodeParameter.mockImplementation((param) => {
				if (param === 'optimizeResponse') return true;
				if (param === 'responseType') return 'json';
				if (param === 'fieldsToInclude') return 'selected';
				if (param === 'fields') return 'key';
			});

			const optimizer = configureResponseOptimizer(mockCtx, 0);
			const response = [{ key: 'value', otherKey: 'otherValue' }];

			expect(optimizer(response)).toEqual([{ key: 'value' }]);
		});

		it('should exclude specified fields', () => {
			mockCtx.getNodeParameter.mockImplementation((param) => {
				if (param === 'optimizeResponse') return true;
				if (param === 'responseType') return 'json';
				if (param === 'fieldsToInclude') return 'except';
				if (param === 'fields') return 'otherKey';
			});

			const optimizer = configureResponseOptimizer(mockCtx, 0);
			const response = [{ key: 'value', otherKey: 'otherValue' }];

			expect(optimizer(response)).toEqual([{ key: 'value' }]);
		});

		it('should throw an error if response is not a valid JSON object', () => {
			mockCtx.getNodeParameter.mockImplementation((param) => {
				if (param === 'optimizeResponse') return true;
				if (param === 'responseType') return 'json';
			});

			const optimizer = configureResponseOptimizer(mockCtx, 0);

			expect(() => optimizer('invalid json')).toThrow(NodeOperationError);
		});
	});
});
