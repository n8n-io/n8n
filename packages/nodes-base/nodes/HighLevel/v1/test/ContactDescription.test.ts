import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodePropertyOptions,
} from 'n8n-workflow';

import { contactOperations } from '../description/ContactDescription';

type PreSendFn = (
	this: IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
) => Promise<IHttpRequestOptions>;

// Reach into the actual routing config so the test breaks if the lookup
// operation stops building its query through the preSend action.
const lookupOption = (contactOperations[0].options as INodePropertyOptions[]).find(
	(option) => option.value === 'lookup',
)!;
const lookupPreSend = lookupOption.routing!.send!.preSend![0] as unknown as PreSendFn;

describe('HighLevel V1 - Contact Lookup query parameters', () => {
	let ctx: MockProxy<IExecuteSingleFunctions>;

	const baseOptions: IHttpRequestOptions = {
		method: 'GET',
		url: '/contacts/lookup',
		baseURL: 'https://rest.gohighlevel.com/v1',
	};

	beforeEach(() => {
		ctx = mock<IExecuteSingleFunctions>();
	});

	it('sends email and phone as discrete query parameters', async () => {
		ctx.getNodeParameter
			.mockReturnValueOnce('jane@example.com') // email
			.mockReturnValueOnce('+15551234567'); // phone

		const result = await lookupPreSend.call(ctx, { ...baseOptions });

		expect(result.qs).toEqual({ email: 'jane@example.com', phone: '+15551234567' });
	});

	it('keeps separator characters contained within a single email parameter', async () => {
		// A value carrying its own query separators must stay within one parameter, not spill into others.
		const email = 'user@example.com&a=b';
		ctx.getNodeParameter
			.mockReturnValueOnce(email) // email
			.mockReturnValueOnce(''); // phone

		const result = await lookupPreSend.call(ctx, { ...baseOptions });

		expect(result.qs).toEqual({ email, phone: '' });
	});
});
