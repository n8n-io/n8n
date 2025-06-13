import type { IWebhookFunctions } from 'n8n-workflow';

import { Github } from '../../Github.node';

describe('Github Node - Webhook Method', () => {
	let githubNode: Github;
	let mockWebhookFunctions: IWebhookFunctions;

	beforeEach(() => {
		githubNode = new Github();

		mockWebhookFunctions = {
			getRequestObject: jest.fn(),
			getResponseObject: jest.fn(),
			getNodeParameter: jest.fn(),
			getNode: jest.fn(),
			helpers: {
				returnJsonArray: jest.fn(),
			},
		} as unknown as IWebhookFunctions;
	});

	it('should process webhook request and return workflowData', async () => {
		const sampleWebhookBody = {
			action: 'opened',
			issue: {
				number: 123,
				title: 'Test Issue',
				body: 'This is a test issue',
				user: {
					login: 'testuser',
				},
			},
			repository: {
				name: 'test-repo',
				owner: {
					login: 'test-owner',
				},
			},
		};

		const mockRequestObject = {
			body: sampleWebhookBody,
			headers: {
				'x-github-event': 'issues',
				'x-github-delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958',
			},
		};

		(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue(mockRequestObject);
		(mockWebhookFunctions.helpers.returnJsonArray as jest.Mock).mockReturnValue([
			sampleWebhookBody,
		]);

		const result = await githubNode.webhook.call(mockWebhookFunctions);

		expect(result).toEqual({
			workflowData: [[sampleWebhookBody]],
		});

		expect(mockWebhookFunctions.getRequestObject).toHaveBeenCalled();
		expect(mockWebhookFunctions.helpers.returnJsonArray).toHaveBeenCalledWith(sampleWebhookBody);
	});
});
