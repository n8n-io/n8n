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
						"https://graph.microsoft.com/v1.0/$metadata#users('b834447b-6848-4af9-8390-d2259ce46b74')/calendarGroups('AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAACLtRu_AAA%3D')/calendars/$entity",
					id: 'AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAAFXBBZ_AAA=',
					name: 'New Calendar',
					color: 'lightOrange',
					hexColor: '#fcab73',
					isDefaultCalendar: false,
					changeKey: 'WX+A3vy5K0qqTyPHso1JgAABVtwWTA==',
					canShare: true,
					canViewPrivateItems: true,
					canEdit: true,
					allowedOnlineMeetingProviders: ['teamsForBusiness'],
					defaultOnlineMeetingProvider: 'teamsForBusiness',
					isTallyingResponses: false,
					isRemovable: true,
					owner: {
						name: 'User Name',
						address: 'test@mail.com',
					},
				};
			}
		}),
	};
});

describe('Test MicrosoftOutlookV2, calendar => create', () => {
	const workflows = ['nodes/Microsoft/Outlook/test/v2/node/calendar/create.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(transport.microsoftApiRequest).toHaveBeenCalledTimes(1);
		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'POST',
			'/calendarGroups/AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAACLtRu_AAA=/calendars',
			{ color: 'lightOrange', name: 'New Calendar' },
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
