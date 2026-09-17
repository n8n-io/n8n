import type { IDataObject, INodeTypeBaseDescription, IWebhookFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { WebflowTriggerV2 } from '../V2/WebflowTriggerV2.node';
import { verifySignature } from '../WebflowTriggerHelpers';

vi.mock('../GenericFunctions', () => ({
	getSites: vi.fn(),
}));

vi.mock('../WebflowTriggerHelpers', () => ({
	verifySignature: vi.fn(),
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
	let response: { status: Mock; send: Mock; end: Mock };
	let context: IWebhookFunctions;
	const body: IDataObject = { triggerType: 'form_submission' };

	beforeEach(() => {
		vi.clearAllMocks();
		response = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
			end: vi.fn().mockReturnThis(),
		};
		context = {
			getRequestObject: vi.fn().mockReturnValue({ body }),
			getResponseObject: vi.fn().mockReturnValue(response),
			helpers: {
				returnJsonArray: vi.fn().mockImplementation((data: IDataObject) => [data]),
			},
		} as unknown as IWebhookFunctions;
	});

	it('rejects a delivery when signature verification fails', async () => {
		vi.mocked(verifySignature).mockResolvedValue(false);

		const result = await trigger.webhook.call(context);

		expect(response.status).toHaveBeenCalledWith(401);
		expect(response.send).toHaveBeenCalledWith('Unauthorized');
		expect(response.end).toHaveBeenCalled();
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('starts the workflow when signature verification succeeds', async () => {
		vi.mocked(verifySignature).mockResolvedValue(true);

		const result = await trigger.webhook.call(context);

		expect(result).toEqual({ workflowData: [[body]] });
		expect(response.status).not.toHaveBeenCalled();
	});
});
