import type { DeepMockProxy } from 'jest-mock-extended';
import { mock, mockDeep } from 'jest-mock-extended';
import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/contact/getAll.operation';
import * as transport from '../../../../v2/transport';

// Real transport except the network helpers, so getOutlookCredentialType keeps its
// behavior and the test can read the qs the operation built.
jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: jest.fn(),
		microsoftApiRequestAllItems: jest.fn(),
	};
});

describe('MicrosoftOutlookV2, contact => getAll', () => {
	let ctx: DeepMockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as jest.Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	const paramsWithFilters = (filters: Record<string, unknown>) => ({
		returnAll: false,
		limit: 10,
		output: 'simple',
		filters,
	});

	// microsoftApiRequest.call(this, 'GET', endpoint, undefined, qs)
	const sentFilter = () => (apiRequest.mock.calls[0][3] as IDataObject).$filter;

	beforeEach(() => {
		jest.clearAllMocks();
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.helpers.returnJsonArray.mockImplementation((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		);
		ctx.helpers.constructExecutionMetaData.mockImplementation((inputData, options) =>
			inputData.map((data) => ({ ...data, pairedItem: options?.itemData })),
		);
		apiRequest.mockResolvedValue({ value: [] });
	});

	it('should build an address filter from a single value', async () => {
		setParams(paramsWithFilters({ emailAddress: 'john@example.com' }));

		await execute.call(ctx, 0);

		expect(sentFilter()).toBe("emailAddresses/any(a:a/address eq 'john@example.com')");
	});

	it('should keep a quote in the address inside the OData literal', async () => {
		setParams(paramsWithFilters({ emailAddress: "o'brien@example.com" }));

		await execute.call(ctx, 0);

		expect(sentFilter()).toBe("emailAddresses/any(a:a/address eq 'o''brien@example.com')");
	});

	// `as string` at the call site would not convert a value an expression resolved
	// to a number, so `.split` used to throw.
	it('should accept a number as the email address filter', async () => {
		setParams(paramsWithFilters({ emailAddress: 123 }));

		await execute.call(ctx, 0);

		expect(sentFilter()).toBe("emailAddresses/any(a:a/address eq '123')");
	});

	it('should keep quotes in every address of a comma separated list', async () => {
		setParams(paramsWithFilters({ emailAddress: "a'b@example.com, c'd@example.com" }));

		await execute.call(ctx, 0);

		expect(sentFilter()).toBe(
			"emailAddresses/any(a:a/address eq 'a''b@example.com') and " +
				"emailAddresses/any(a:a/address eq 'c''d@example.com')",
		);
	});
});
