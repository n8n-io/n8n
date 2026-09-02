import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import { type IExecuteFunctions } from 'n8n-workflow';

import { WhatsApp } from '../../WhatsApp.node';
import type { Mock } from 'vitest';

describe('Test WhatsApp Business Cloud, sendAndWait operation', () => {
	let whatsApp: WhatsApp;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		whatsApp = new WhatsApp();
		mockExecuteFunctions = mock<IExecuteFunctions>();

		mockExecuteFunctions.helpers = {
			httpRequestWithAuthentication: vi.fn().mockResolvedValue({}),
		} as any;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should send message and put execution to wait', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'phoneNumberId') return '11111';
			if (key === 'recipientPhoneNumber') return '22222';
			if (key === 'message') return 'my message';
			if (key === 'subject') return '';
			if (key === 'approvalOptions.values') return {};
			if (key === 'responseType') return 'approval';
			if (key === 'sendTo') return 'channel';
			if (key === 'channelId') return 'channelID';
			if (key === 'options.limitWaitTime.values') return {};
		});

		mockExecuteFunctions.putExecutionToWait.mockImplementation(async () => {});
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');

		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);

		const result = await whatsApp.customOperations.message.sendAndWait.call(mockExecuteFunctions);

		expect(result).toEqual([items]);

		expect(mockExecuteFunctions.putExecutionToWait).toHaveBeenCalledTimes(1);

		expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'whatsAppApi',
			{
				baseURL: 'https://graph.facebook.com/v13.0/',
				body: {
					messaging_product: 'whatsapp',
					text: {
						body: 'my message\n\n*Approve:*\n_http://localhost/waiting-webhook/nodeID?approved=true&signature=abc_\n\n',
					},
					to: '22222',
					type: 'text',
				},
				method: 'POST',
				url: '11111/messages',
			},
		);
	});

	it('should route API errors to error output when continueOnFail is true', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'phoneNumberId') return '11111';
			if (key === 'recipientPhoneNumber') return '22222';
			if (key === 'message') return 'my message';
			if (key === 'subject') return '';
			if (key === 'approvalOptions.values') return {};
			if (key === 'responseType') return 'approval';
			if (key === 'sendTo') return 'channel';
			if (key === 'channelId') return 'channelID';
			if (key === 'options.limitWaitTime.values') return {};
		});
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);

		(mockExecuteFunctions.helpers.httpRequestWithAuthentication as Mock).mockRejectedValueOnce(
			new Error('invalid_recipient'),
		);

		const result = await whatsApp.customOperations.message.sendAndWait.call(mockExecuteFunctions);

		expect(result).toEqual([[{ json: { error: 'invalid_recipient' } }]]);
		expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
	});

	it('should throw NodeOperationError when continueOnFail is false', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'phoneNumberId') return '11111';
			if (key === 'recipientPhoneNumber') return '22222';
			if (key === 'message') return 'my message';
			if (key === 'subject') return '';
			if (key === 'approvalOptions.values') return {};
			if (key === 'responseType') return 'approval';
			if (key === 'sendTo') return 'channel';
			if (key === 'channelId') return 'channelID';
			if (key === 'options.limitWaitTime.values') return {};
		});
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		(mockExecuteFunctions.helpers.httpRequestWithAuthentication as Mock).mockRejectedValueOnce(
			new Error('invalid_recipient'),
		);

		await expect(
			whatsApp.customOperations.message.sendAndWait.call(mockExecuteFunctions),
		).rejects.toThrow('invalid_recipient');
		expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
	});
});
