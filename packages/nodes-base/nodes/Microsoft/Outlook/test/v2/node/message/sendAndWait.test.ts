import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { SEND_AND_WAIT_OPERATION, type IExecuteFunctions } from 'n8n-workflow';

import { description } from '../../../../v2/actions/node.description';
import { MicrosoftOutlookV2 } from '../../../../v2/MicrosoftOutlookV2.node';
import * as transport from '../../../../v2/transport';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: jest.fn(async function (method: string) {
			if (method === 'POST') {
				return {};
			}
		}),
	};
});

describe('Test MicrosoftOutlookV2, message => sendAndWait', () => {
	let microsoftOutlook: MicrosoftOutlookV2;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		microsoftOutlook = new MicrosoftOutlookV2(description);
		mockExecuteFunctions = mock<IExecuteFunctions>();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should send message and put execution to wait', async () => {
		const items = [{ json: { data: 'test' } }];
		//router
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(SEND_AND_WAIT_OPERATION);
		mockExecuteFunctions.putExecutionToWait.mockImplementation();

		//operation
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my@outlook.com');
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');

		//getSendAndWaitConfig
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
		mockExecuteFunctions.evaluateExpression.mockReturnValueOnce('http://localhost/waiting-webhook');
		mockExecuteFunctions.evaluateExpression.mockReturnValueOnce('nodeID');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // approvalOptions
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // options
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval');

		// configureWaitTillDate
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); //options.limitWaitTime.values

		const result = await microsoftOutlook.execute.call(mockExecuteFunctions);

		expect(result).toEqual([items]);
		expect(transport.microsoftApiRequest).toHaveBeenCalledTimes(1);
		expect(mockExecuteFunctions.putExecutionToWait).toHaveBeenCalledTimes(1);

		expect(transport.microsoftApiRequest).toHaveBeenCalledWith('POST', '/sendMail', {
			message: {
				body: {
					content: expect.stringContaining(
						'href="http://localhost/waiting-webhook/nodeID?approved=true"',
					),
					contentType: 'html',
				},
				subject: 'my subject',
				toRecipients: [{ emailAddress: { address: 'my@outlook.com' } }],
			},
		});
	});
});
