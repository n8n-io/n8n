import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';

import * as GenericFunctions from '../GenericFunctions';
import type * as _importType0 from '../GenericFunctions';
import { Gitlab } from '../Gitlab.node';

vi.mock('../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../GenericFunctions')),
	gitlabApiRequest: vi.fn(),
}));

describe('Gitlab Node - Issue Edit Operation', () => {
	let gitlab: Gitlab;
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;

	/** Returns the request body the node sent to the GitLab API. */
	const sentBody = () =>
		(GenericFunctions.gitlabApiRequest as Mock).mock.calls[0][2] as IDataObject;

	const setParams = (editFields: IDataObject) => {
		(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
			const params: Record<string, unknown> = {
				authentication: 'accessToken',
				resource: 'issue',
				operation: 'edit',
				owner: 'test-owner',
				repository: 'test-repo',
				issueNumber: '42',
				editFields,
			};
			return params[paramName];
		});
	};

	beforeEach(() => {
		gitlab = new Gitlab();
		vi.clearAllMocks();

		(GenericFunctions.gitlabApiRequest as Mock).mockResolvedValue({ iid: 42 });

		mockExecuteFunctions = {
			getNodeParameter: vi.fn(),
			getInputData: vi.fn().mockReturnValue([{ json: {} }]),
			getNode: vi.fn().mockReturnValue({
				id: 'test-node-id',
				name: 'Gitlab',
				type: 'n8n-nodes-base.gitlab',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			}),
			helpers: {
				returnJsonArray: vi.fn((data) => (Array.isArray(data) ? data : [data])),
				constructExecutionMetaData: vi.fn((data) => data),
			},
			getCredentials: vi.fn().mockResolvedValue({
				accessToken: 'test-token',
				server: 'https://gitlab.example.com',
			}),
			continueOnFail: vi.fn().mockReturnValue(false),
		} as unknown as Mocked<IExecuteFunctions>;
	});

	it('should send state_event "close" when the state is set to closed', async () => {
		setParams({ state: 'closed' });

		await gitlab.execute.call(mockExecuteFunctions);

		const body = sentBody();
		expect(body.state_event).toBe('close');
		// `state` is not a field on GitLab's edit endpoint — sending it closes nothing.
		expect(body).not.toHaveProperty('state');
	});

	it('should send state_event "reopen" when the state is set to open', async () => {
		setParams({ state: 'open' });

		await gitlab.execute.call(mockExecuteFunctions);

		const body = sentBody();
		expect(body.state_event).toBe('reopen');
		expect(body).not.toHaveProperty('state');
	});

	it('should use the PUT method against the issue endpoint', async () => {
		setParams({ state: 'closed' });

		await gitlab.execute.call(mockExecuteFunctions);

		const [method, endpoint] = (GenericFunctions.gitlabApiRequest as Mock).mock.calls[0];
		expect(method).toBe('PUT');
		expect(endpoint).toBe('/projects/test-owner%2Ftest-repo/issues/42');
	});

	it('should not add state_event when the state field is left unset', async () => {
		setParams({ title: 'Updated title' });

		await gitlab.execute.call(mockExecuteFunctions);

		const body = sentBody();
		expect(body).not.toHaveProperty('state_event');
		expect(body.title).toBe('Updated title');
	});

	it('should leave an unrecognised state value untouched', async () => {
		setParams({ state: 'something-else' });

		await gitlab.execute.call(mockExecuteFunctions);

		const body = sentBody();
		expect(body).not.toHaveProperty('state_event');
		expect(body.state).toBe('something-else');
	});

	it('should translate the state alongside the other edit fields', async () => {
		setParams({
			state: 'closed',
			title: 'Updated title',
			labels: [{ label: 'bug' }, { label: 'urgent' }],
			assignee_ids: [{ assignee: 7 }],
		});

		await gitlab.execute.call(mockExecuteFunctions);

		const body = sentBody();
		expect(body.state_event).toBe('close');
		expect(body).not.toHaveProperty('state');
		expect(body.title).toBe('Updated title');
		expect(body.labels).toBe('bug,urgent');
		expect(body.assignee_ids).toEqual([7]);
	});
});
