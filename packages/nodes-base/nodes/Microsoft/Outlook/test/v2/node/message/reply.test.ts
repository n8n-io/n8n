import type { INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../../v2/transport';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: jest.fn(async function (method: string) {
			if (method === 'POST') {
				return {
					'@odata.context':
						"https://graph.microsoft.com/v1.0/$metadata#users('b834447b-6848-4af9-8390-d2259ce46b74')/messages/$entity",
					'@odata.etag': 'W/"CQAAABYAAABZf4De/LkrSqpPI8eyjUmAAAFW3CX+"',
					id: 'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEPAABZf4De-LkrSqpPI8eyjUmAAAFXBDurAAA=',
					createdDateTime: '2023-09-04T12:29:59Z',
					lastModifiedDateTime: '2023-09-04T12:29:59Z',
					changeKey: 'CQAAABYAAABZf4De/LkrSqpPI8eyjUmAAAFW3CX+',
					categories: [],
					receivedDateTime: '2023-09-04T12:29:59Z',
					sentDateTime: '2023-09-04T12:29:59Z',
					hasAttachments: false,
					internetMessageId:
						'<AM0PR10MB2100903A148F1623165004E3DDE9A@AM0PR10MB2100.EURPRD10.PROD.OUTLOOK.COM>',
					subject: 'Reply Subject',
					bodyPreview: 'Reply message',
					importance: 'high',
					parentFolderId:
						'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAuAAAAAABPLqzvT6b9RLP0CKzHiJrRAQBZf4De-LkrSqpPI8eyjUmAAAAAAAEPAAA=',
					conversationId:
						'AAQkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAQAKwkQLinj69KtoFOxMG2lVY=',
					conversationIndex: 'AQHZ3yq3rCRAuKePr0q2gU7EwbaVVrAKmLQ4',
					isDeliveryReceiptRequested: false,
					isReadReceiptRequested: false,
					isRead: true,
					isDraft: true,
					webLink:
						'https://outlook.office365.com/owa/?ItemID=AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De%2FLkrSqpPI8eyjUmAAAAAAAEPAABZf4De%2FLkrSqpPI8eyjUmAAAFXBDurAAA%3D&exvsurl=1&viewmodel=ReadMessageItem',
					inferenceClassification: 'focused',
					body: {
						contentType: 'html',
						content:
							'<html><head>\r\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body>Reply message </body></html>',
					},
					sender: {
						emailAddress: {
							name: 'Michael Kret',
							address: 'MichaelDevSandbox@5w1hb7.onmicrosoft.com',
						},
					},
					from: {
						emailAddress: {
							name: 'Michael Kret',
							address: 'MichaelDevSandbox@5w1hb7.onmicrosoft.com',
						},
					},
					toRecipients: [
						{
							emailAddress: {
								name: 'reply@mail.com',
								address: 'reply@mail.com',
							},
						},
					],
					ccRecipients: [],
					bccRecipients: [],
					replyTo: [],
					flag: {
						flagStatus: 'notFlagged',
					},
				};
			}
		}),
	};
});

describe('Test MicrosoftOutlookV2, message => reply', () => {
	const workflows = ['nodes/Microsoft/Outlook/test/v2/node/message/reply.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(transport.microsoftApiRequest).toHaveBeenCalledTimes(2);
		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'POST',
			'/messages/AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEJAABZf4De-LkrSqpPI8eyjUmAAAFXBEVwAAA=/createReply',
			{
				message: {
					body: { content: 'Reply message', contentType: 'html' },
					importance: 'High',
					subject: 'Reply Subject',
				},
			},
		);
		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'POST',
			'/messages/AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEPAABZf4De-LkrSqpPI8eyjUmAAAFXBDurAAA=/send',
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
