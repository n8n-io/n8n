import type { IDataObject, INodeTypeBaseDescription, IWebhookFunctions } from 'n8n-workflow';

import { WebflowTriggerV2 } from '../V2/WebflowTriggerV2.node';
import { verifySignature } from '../WebflowTriggerHelpers';

jest.mock('../GenericFunctions', () => ({
	getSites: jest.fn(),
}));

jest.mock('../WebflowTriggerHelpers', () => ({
	verifySignature: jest.fn(),
}));

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'Webflow Trigger',
	name: 'webflowTrigger',
	icon: 'file:webflow.svg',
	group: ['trigger'],
	description: 'Handle Webflow events via webhooks',
	defaultVersion: 2,
};

describe('WebflowTriggerV2', () => {
	const trigger = new WebflowTriggerV2(baseDescription);
	let response: { status: jest.Mock; send: jest.Mock; end: jest.Mock };
	let context: IWebhookFunctions;
	const body: IDataObject = { triggerType: 'form_submission' };

	beforeEach(() => {
		jest.clearAllMocks();
		response = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			end: jest.fn().mockReturnThis(),
		};
		context = {
			getRequestObject: jest.fn().mockReturnValue({ body }),
			getResponseObject: jest.fn().mockReturnValue(response),
			helpers: {
				returnJsonArray: jest.fn().mockImplementation((data: IDataObject) => [data]),
			},
		} as unknown as IWebhookFunctions;
	});

	it('rejects a delivery when signature verification fails', async () => {
		jest.mocked(verifySignature).mockResolvedValue(false);

		const result = await trigger.webhook.call(context);

		expect(response.status).toHaveBeenCalledWith(401);
		expect(response.send).toHaveBeenCalledWith('Unauthorized');
		expect(response.end).toHaveBeenCalled();
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('starts the workflow when signature verification succeeds', async () => {
		jest.mocked(verifySignature).mockResolvedValue(true);

		const result = await trigger.webhook.call(context);

		expect(result).toEqual({ workflowData: [[body]] });
		expect(response.status).not.toHaveBeenCalled();
	});
});
