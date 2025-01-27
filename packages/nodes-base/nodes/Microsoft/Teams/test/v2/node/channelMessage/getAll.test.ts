import type { INodeTypes } from 'n8n-workflow';

import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';

import * as transport from '../../../../v2/transport';

const microsoftApiRequestSpy = jest.spyOn(transport, 'microsoftApiRequestAllItems');

microsoftApiRequestSpy.mockImplementation(async (_, method: string) => {
	if (method === 'GET') {
		return [
			{
				id: '1698130964682',
				replyToId: null,
				etag: '1698130964682',
				messageType: 'message',
				createdDateTime: '2023-10-24T07:02:44.682Z',
				lastModifiedDateTime: '2023-10-24T07:02:44.682Z',
				lastEditedDateTime: null,
				deletedDateTime: null,
				subject: '',
				summary: null,
				chatId: null,
				importance: 'normal',
				locale: 'en-us',
				webUrl:
					'https://teams.microsoft.com/l/message/threadId/1698130964682?groupId=1111-2222-3333&tenantId=tenantId-111-222-333&createdTime=1698130964682&parentMessageId=1698130964682',
				onBehalfOf: null,
				policyViolation: null,
				eventDetail: null,
				from: {
					application: null,
					device: null,
					user: {
						'@odata.type': '#microsoft.graph.teamworkUserIdentity',
						id: '11111-2222-3333',
						displayName: 'My Name',
						userIdentityType: 'aadUser',
						tenantId: 'tenantId-111-222-333',
					},
				},
				body: {
					contentType: 'html',
					content:
						'<div>I added a tab at the top of this channel. Check it out!</div><attachment id="tab::f22a0494-6f7c-4512-85c5-e4ce72ce142a"></attachment>',
				},
				channelIdentity: {
					teamId: '1111-2222-3333',
					channelId: '42:aaabbbccc.tacv2',
				},
				attachments: [
					{
						id: 'tab::f22a0494-6f7c-4512-85c5-e4ce72ce142a',
						contentType: 'tabReference',
						contentUrl: null,
						content: null,
						name: 'Tasks',
						thumbnailUrl: null,
						teamsAppId: null,
					},
				],
				mentions: [],
				reactions: [],
			},
		];
	}
});

describe('Test MicrosoftTeamsV2, channelMessage => getAll', () => {
	const workflows = ['nodes/Microsoft/Teams/test/v2/node/channelMessage/getAll.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(microsoftApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(microsoftApiRequestSpy).toHaveBeenCalledWith(
			'value',
			'GET',
			'/beta/teams/1111-2222-3333/channels/42:aaabbbccc.tacv2/messages',
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
