import FormData from 'form-data';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { IBinaryData, IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

import {
	buildRequestBody,
	mindeeApiRequest,
	extractPollingUrl,
	isMindeeOperation,
	pollMindee,
	readUIParams,
} from '../GenericFunctions';
import { getModels } from '../SearchFunctions';

vi.mock('@n8n/utils/sleep', () => ({ sleep: vi.fn().mockResolvedValue(undefined) }));

const POLLING_URL = requestUrl`https://api-v2.mindee.net/v2/jobs/job-id`;
const processing = { job: { id: 'job-id', status: 'Processing' } };
const node = mock<INode>({ typeVersion: 4 });

describe('Mindee V2 > pollMindee', () => {
	const context = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		vi.clearAllMocks();
		context.getNode.mockReturnValue(node);
	});

	it('should return the inference when the first poll already has it', async () => {
		const inference = { inference: { id: 'inference-id' } };
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce(inference);

		await expect(pollMindee(context, POLLING_URL, 5)).resolves.toEqual([inference]);
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('should poll until the inference is available', async () => {
		const inference = { inference: { id: 'inference-id' } };
		context.helpers.httpRequestWithAuthentication
			.mockResolvedValueOnce(processing)
			.mockResolvedValueOnce(processing)
			.mockResolvedValueOnce(inference);

		await expect(pollMindee(context, POLLING_URL, 5)).resolves.toEqual([inference]);
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(3);
	});

	it('should throw when the job failed', async () => {
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({
			job: { id: 'job-id', status: 'Failed' },
		});

		await expect(pollMindee(context, POLLING_URL, 5)).rejects.toThrow(NodeApiError);
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('should throw when a later poll reports a failed job', async () => {
		context.helpers.httpRequestWithAuthentication
			.mockResolvedValueOnce(processing)
			.mockResolvedValueOnce({ job: { id: 'job-id', status: 'Failed' } });

		await expect(pollMindee(context, POLLING_URL, 1)).rejects.toThrow(NodeApiError);
	});

	it('should throw when the job reports an error', async () => {
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({
			job: { id: 'job-id', status: 'Processing', error: { detail: 'boom' } },
		});

		await expect(pollMindee(context, POLLING_URL, 5)).rejects.toThrow(NodeApiError);
	});

	it('should throw when the API returns an error body', async () => {
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({
			status: 401,
			detail: 'Unauthorized',
		});

		await expect(pollMindee(context, POLLING_URL, 5)).rejects.toThrow(NodeApiError);
	});

	it('should throw when the reply has neither a job nor an inference', async () => {
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({});

		await expect(pollMindee(context, POLLING_URL, 5)).rejects.toThrow(
			'The Mindee API replied with an unexpected reply.',
		);
	});

	it('should time out with the last job status', async () => {
		context.helpers.httpRequestWithAuthentication.mockResolvedValue(processing);

		await expect(pollMindee(context, POLLING_URL, 2)).rejects.toThrow(
			'Server polling timed out after 2 seconds. Status: Processing.',
		);
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(3);
	});
});

describe('Mindee V2 > extractPollingUrl', () => {
	const context = mockDeep<IExecuteFunctions>();
	context.getNode.mockReturnValue(node);

	it('should return the polling URL', () => {
		const pollingUrl = 'https://api-v2.mindee.net/v2/jobs/job-id';

		expect(extractPollingUrl(context, { job: { polling_url: pollingUrl } }).value).toBe(pollingUrl);
	});

	it('should throw when the polling URL points to another host', () => {
		expect(() =>
			extractPollingUrl(context, { job: { polling_url: 'https://example.com/v2/jobs/job-id' } }),
		).toThrow(NodeApiError);
	});

	it('should throw when the polling URL is missing', () => {
		expect(() => extractPollingUrl(context, { job: {} })).toThrow(NodeApiError);
	});
});

describe('Mindee V2 > readUIParams', () => {
	function createContext(parameters: Record<string, unknown>) {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockImplementation(
			(name: string, _index: number, fallback?: unknown) => (parameters[name] ?? fallback) as never,
		);
		return context;
	}

	it('should use defaults for missing options', () => {
		const params = readUIParams(createContext({ modelId: 'model-id' }), 0);

		expect(params).toMatchObject({
			modelId: 'model-id',
			toggles: {},
			pollingTimeoutCount: 180,
			documentSource: 'binary',
		});
	});

	it('should read the model ID from a resource locator value', () => {
		const params = readUIParams(
			createContext({ modelId: { mode: 'list', value: 'model-id' }, options: { rag: 'true' } }),
			0,
		);

		expect(params.modelId).toBe('model-id');
		expect(params.toggles).toEqual({ rag: 'true' });
	});

	it('should map toggle options to their form fields and skip defaults', () => {
		const params = readUIParams(
			createContext({
				modelId: 'model-id',
				options: { rawText: 'false', polygon: 'default', confidence: 'true' },
			}),
			0,
		);

		expect(params.toggles).toEqual({ raw_text: 'false', confidence: 'true' });
	});

	it('should read the document URL for the URL source', () => {
		const params = readUIParams(
			createContext({
				modelId: 'model-id',
				documentSource: 'url',
				documentUrl: 'https://example.com/invoice.pdf',
			}),
			0,
		);

		expect(params.documentUrl).toBe('https://example.com/invoice.pdf');
		expect(params.binaryPropertyName).toBeUndefined();
	});
});

describe('Mindee V2 > getModels', () => {
	const context = mockDeep<ILoadOptionsFunctions>();

	beforeEach(() => {
		vi.clearAllMocks();
		context.getNode.mockReturnValue(node);
		context.getCurrentNodeParameter.mockReturnValue('extraction');
	});

	it('should request the models of the selected operation', async () => {
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({
			models: [{ id: 'model-id', name: 'Invoice' }],
			pagination: { page: 1, total_pages: 1 },
		});

		const result = await getModels.call(context, 'inv');

		expect(result.results).toEqual([{ name: 'Invoice', value: 'model-id' }]);
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'mindeeApi',
			expect.objectContaining({
				qs: { name: 'inv', model_type: 'extraction', page: 1, per_page: 50 },
			}),
		);
	});

	it('should return the next page as pagination token while more pages exist', async () => {
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({
			models: [],
			pagination: { page: 2, total_pages: 3 },
		});

		const result = await getModels.call(context, undefined, '2');

		expect(result.paginationToken).toBe('3');
	});

	it('should not return a pagination token on the last page', async () => {
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({
			models: [],
			pagination: { page: 3, total_pages: 3 },
		});

		const result = await getModels.call(context, undefined, '3');

		expect(result.paginationToken).toBeUndefined();
	});
});

describe('Mindee V2 > isMindeeOperation', () => {
	it.each(['extraction', 'classification', 'crop', 'ocr', 'split'])('should accept %s', (value) => {
		expect(isMindeeOperation(value)).toBe(true);
	});

	it.each(['../jobs', 'extraction/../x', '', undefined, 1])('should reject %s', (value) => {
		expect(isMindeeOperation(value)).toBe(false);
	});
});

describe('Mindee V2 > buildRequestBody', () => {
	it('should append the model ID and the enabled toggles to the form', async () => {
		const form = new FormData();

		await buildRequestBody(
			mockDeep<IExecuteFunctions>(),
			0,
			{
				modelId: 'model-id',
				toggles: { rag: 'true', raw_text: 'false' },
				pollingTimeoutCount: 180,
				documentSource: 'url',
				documentUrl: 'https://example.com/invoice.pdf',
			},
			form,
		);

		const body = form.getBuffer().toString();
		expect(body).toContain('name="url"');
		expect(body).toContain('name="model_id"');
		expect(body).toContain('name="rag"');
		expect(body).toContain('name="raw_text"');
		expect(body).not.toContain('name="polygon"');
	});
});

describe('Mindee V2 > mindeeApiRequest', () => {
	const context = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		vi.clearAllMocks();
		context.getNode.mockReturnValue(node);
	});

	it('should send the headers with the user agent of the node version', async () => {
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({ ok: true });

		const result = await mindeeApiRequest.call(context, 'GET', POLLING_URL, {}, {}, { a: 'b' });

		expect(result).toEqual({ ok: true });
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'mindeeApi',
			expect.objectContaining({ headers: { a: 'b', 'User-Agent': 'mindee-api-n8n@v4' } }),
		);
	});

	it('should throw when the response is not an object', async () => {
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce('text');

		await expect(mindeeApiRequest.call(context, 'GET', POLLING_URL)).rejects.toThrow(
			'Mindee API returned a non-object response',
		);
	});

	it('should wrap request failures', async () => {
		context.helpers.httpRequestWithAuthentication.mockRejectedValueOnce(new Error('network'));

		await expect(mindeeApiRequest.call(context, 'GET', POLLING_URL)).rejects.toThrow(NodeApiError);
	});
});

describe('Mindee V2 > buildRequestBody (binary source)', () => {
	const baseParams = {
		modelId: 'model-id',
		toggles: {},
		pollingTimeoutCount: 180,
	};

	it('should append the binary file', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.assertBinaryData.mockReturnValue(mock<IBinaryData>({ fileName: 'doc.pdf' }));
		context.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('content'));
		const form = new FormData();

		await buildRequestBody(
			context,
			0,
			{ ...baseParams, documentSource: 'binary', binaryPropertyName: 'data' },
			form,
		);

		const body = form.getBuffer().toString();
		expect(body).toContain('name="file"; filename="doc.pdf"');
		expect(body).toContain('content');
	});

	it('should require a binary field name', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);

		await expect(
			buildRequestBody(
				context,
				0,
				{ ...baseParams, documentSource: 'binary', binaryPropertyName: '' },
				new FormData(),
			),
		).rejects.toThrow('An input data field name is required');
	});

	it('should require a document URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);

		await expect(
			buildRequestBody(
				context,
				0,
				{ ...baseParams, documentSource: 'url', documentUrl: '' },
				new FormData(),
			),
		).rejects.toThrow('A document URL is required');
	});
});

describe('Mindee V2 > readUIParams (options)', () => {
	it('should use a custom polling timeout', () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockImplementation(
			(name: string, _index: number, fallback?: unknown) =>
				({ options: { pollingTimeoutCount: 30 } })[name as 'options'] ?? (fallback as never),
		);

		expect(readUIParams(context, 0).pollingTimeoutCount).toBe(30);
	});
});

describe('Mindee V2 > getModels (fallbacks)', () => {
	const context = mockDeep<ILoadOptionsFunctions>();

	beforeEach(() => {
		vi.clearAllMocks();
		context.getNode.mockReturnValue(node);
		context.getCurrentNodeParameter.mockReturnValue('extraction');
	});

	it('should return no models when the response has none', async () => {
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({});

		const result = await getModels.call(context);

		expect(result).toEqual({ results: [], paginationToken: undefined });
	});

	it('should fall back to the ID when a model has no name', async () => {
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce({
			models: [{ id: 'abc-123' }],
		});

		const result = await getModels.call(context);

		expect(result.results).toEqual([{ name: 'abc-123', value: 'abc-123' }]);
	});
});
