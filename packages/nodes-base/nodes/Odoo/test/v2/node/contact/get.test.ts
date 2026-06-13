import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { OdooV2 } from '../../../../v2/OdooV2.node';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import * as transport from '../../../../v2/transport';

jest.mock('../../../../v2/transport', () => ({
	odooApiRequest: jest.fn(),
}));

const MOCK_CONTACT = { id: 42, name: 'Jane Doe', email: 'jane@example.com' };

describe('OdooV2 — contact:get', () => {
	let node: OdooV2;
	let exec: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		node = new OdooV2(versionDescription);
		exec = mock<IExecuteFunctions>();
		exec.helpers = {
			constructExecutionMetaData: jest.fn((data) => data),
			returnJsonArray: jest.fn((data) =>
				(Array.isArray(data) ? data : [data]).map((j) => ({ json: j })),
			),
		} as any;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	const setupParams = (overrides: Record<string, unknown> = {}) => {
		const params: Record<string, unknown> = {
			resource: 'contact',
			operation: 'get',
			authentication: 'odooApiKeyApi',
			contactId: 42,
			options: {},
			...overrides,
		};
		exec.getInputData.mockReturnValue([{ json: {} }]);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		exec.getNodeParameter.mockImplementation((key: string) => params[key] as any);
	};

	it('fetches a contact by ID with no field filter', async () => {
		setupParams();
		(transport.odooApiRequest as jest.Mock).mockResolvedValue([MOCK_CONTACT]);

		const result = await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'read', {
			ids: [42],
			fields: [],
		});
		expect(result[0][0].json).toEqual(MOCK_CONTACT);
	});

	it('passes selected fields to the API call', async () => {
		setupParams({ options: { fieldsList: ['name', 'email'] } });
		(transport.odooApiRequest as jest.Mock).mockResolvedValue([MOCK_CONTACT]);

		await node.execute.call(exec);

		expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'read', {
			ids: [42],
			fields: ['name', 'email'],
		});
	});

	it('returns error item and continues when continueOnFail is true', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(true);
		(transport.odooApiRequest as jest.Mock).mockRejectedValue(new Error('Not found'));

		const result = await node.execute.call(exec);

		expect(result[0][0].json).toEqual({ error: 'Not found' });
	});

	it('rethrows the error when continueOnFail is false', async () => {
		setupParams();
		exec.continueOnFail.mockReturnValue(false);
		(transport.odooApiRequest as jest.Mock).mockRejectedValue(new Error('Not found'));

		await expect(node.execute.call(exec)).rejects.toThrow('Not found');
	});
});
