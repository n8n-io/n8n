import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { googleApiRequest } from '../../GenericFunctions';
import { GmailV2 } from '../../v2/GmailV2.node';

vi.mock('../../GenericFunctions', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../GenericFunctions')>()),
	googleApiRequest: vi.fn(),
}));

const apiRequest = vi.mocked(googleApiRequest);

function createLabelContext(parentLabelName: string) {
	const ctx = mock<IExecuteFunctions>();
	const params: Record<string, unknown> = {
		resource: 'label',
		operation: 'create',
		name: '1067',
		parentLabelName,
	};
	ctx.getInputData.mockReturnValue([{ json: {} }]);
	ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.2 }));
	ctx.getNodeParameter.mockImplementation(((name: string, _i: number, fallback: unknown) =>
		name in params ? params[name] : fallback) as never);
	// The node calls helpers via `.call()`, so they must be real functions, not proxies.
	ctx.helpers = {
		returnJsonArray: vi.fn((data: object) => [data].flat().map((json) => ({ json }))),
		constructExecutionMetaData: vi.fn((data: unknown) => data),
	} as never;
	return ctx;
}

const createdNames = () =>
	apiRequest.mock.calls
		.filter(([method]) => method === 'POST')
		.map(([, , body]) => (body as { name: string }).name);

describe('Gmail nested label create', () => {
	beforeEach(() => apiRequest.mockReset());

	it('should create missing parent labels before the label itself', async () => {
		apiRequest.mockImplementation((async (method: string) =>
			method === 'GET' ? { labels: [{ id: 'Label_1', name: 'Jobs' }] } : { id: 'new' }) as never);

		await new GmailV2(mock()).execute.call(createLabelContext('Jobs/2026'));

		expect(createdNames()).toEqual(['Jobs/2026', 'Jobs/2026/1067']);
	});

	it('should only create the label when the parent exists', async () => {
		apiRequest.mockImplementation((async (method: string) =>
			method === 'GET' ? { labels: [{ id: 'Label_1', name: 'jobs' }] } : { id: 'new' }) as never);

		await new GmailV2(mock()).execute.call(createLabelContext('Jobs'));

		// The existing parent's casing wins so Gmail nests the new label under it.
		expect(createdNames()).toEqual(['jobs/1067']);
	});

	it('should carry on when a parallel run already created the missing parent', async () => {
		apiRequest.mockImplementation((async (
			method: string,
			_endpoint: string,
			body: { name: string },
		) => {
			if (method === 'GET') return { labels: [] };
			if (body?.name === 'Jobs')
				throw Object.assign(new Error('Label name exists'), { httpCode: '409' });
			return { id: 'new', name: body?.name };
		}) as never);

		const [[result]] = await new GmailV2(mock()).execute.call(createLabelContext('Jobs'));

		expect(createdNames()).toEqual(['Jobs', 'Jobs/1067']);
		expect(result.json).toEqual({ id: 'new', name: 'Jobs/1067' });
	});

	it('should still fail on other parent creation errors', async () => {
		apiRequest
			.mockResolvedValueOnce({ labels: [] })
			.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { httpCode: '403' }));

		let error: unknown;
		try {
			await new GmailV2(mock()).execute.call(createLabelContext('Jobs'));
		} catch (caught) {
			error = caught;
		}

		expect((error as Error).message).toContain('Forbidden');
		expect(createdNames()).toEqual(['Jobs']);
	});
});
