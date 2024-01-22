import type { INodeTypes } from 'n8n-workflow';
import nock from 'nock';
import * as transport from '../../../../v2/transport';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';
import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';

const microsoftApiRequestSpy = jest.spyOn(transport, 'microsoftApiRequest');

microsoftApiRequestSpy.mockImplementation(async (method: string) => {
	if (method === 'GET') {
		return {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#chats('19%3Aebed9ad42c904d6c83adf0db360053ec%40thread.v2')/messages/$entity",
			id: '1698378560692',
			replyToId: null,
			etag: '1698378560692',
			messageType: 'message',
			createdDateTime: '2023-10-27T03:49:20.692Z',
			lastModifiedDateTime: '2023-10-27T03:49:20.692Z',
			lastEditedDateTime: null,
			deletedDateTime: null,
			subject: null,
			summary: null,
			chatId: '19:ebed9ad42c904d6c83adf0db360053ec@thread.v2',
			importance: 'normal',
			locale: 'en-us',
			webUrl: null,
			channelIdentity: null,
			policyViolation: null,
			eventDetail: null,
			from: {
				application: null,
				device: null,
				user: {
					'@odata.type': '#microsoft.graph.teamworkUserIdentity',
					id: '11111-2222-3333',
					displayName: 'Michael Kret',
					userIdentityType: 'aadUser',
					tenantId: '23786ca6-7ff2-4672-87d0-5c649ee0a337',
				},
			},
			body: {
				contentType: 'html',
				content:
					'Hello!<br>\n<br>\n<em> Powered by <a href="http://localhost:5678/workflow/i3NYGF0LXV4qDFV9?utm_source=n8n-internal&amp;utm_medium=powered_by&amp;utm_campaign=n8n-nodes-base.microsoftTeams_b888bd11cd1ddbb95450babf3e199556799d999b896f650de768b8370ee50363">this n8n workflow</a> </em>',
			},
			attachments: [],
			mentions: [],
			reactions: [],
		};
	}
});

describe('Test MicrosoftTeamsV2, chatMessage => get', () => {
	const workflows = ['nodes/Microsoft/Teams/test/v2/node/chatMessage/get.workflow.json'];
	const tests = workflowToTests(workflows);

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.resetAllMocks();
	});

	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(microsoftApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(microsoftApiRequestSpy).toHaveBeenCalledWith(
			'GET',
			'/v1.0/chats/19:ebed9ad42c904d6c83adf0db360053ec@thread.v2/messages/1698378560692',
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
