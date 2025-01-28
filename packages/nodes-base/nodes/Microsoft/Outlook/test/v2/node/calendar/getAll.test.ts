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
			if (method === 'GET') {
				return {
					value: [
						{
							id: 'AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAAAJ9-JDAAA=',
							name: 'Calendar',
							color: 'auto',
							hexColor: '',
							isDefaultCalendar: true,
							changeKey: 'WX+A3vy5K0qqTyPHso1JgAAACfdHfw==',
							canShare: true,
							canViewPrivateItems: true,
							canEdit: true,
							allowedOnlineMeetingProviders: ['teamsForBusiness'],
							defaultOnlineMeetingProvider: 'teamsForBusiness',
							isTallyingResponses: true,
							isRemovable: false,
							owner: {
								name: 'User Name',
								address: 'test@mail.com',
							},
						},
						{
							id: 'AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAACLtRvBAAA=',
							name: 'Third calendar',
							color: 'lightYellow',
							hexColor: '#fde300',
							isDefaultCalendar: false,
							changeKey: 'WX+A3vy5K0qqTyPHso1JgAAAi67hIw==',
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
						},
					],
				};
			}
		}),
	};
});

describe('Test MicrosoftOutlookV2, calendar => getAll', () => {
	const workflows = ['nodes/Microsoft/Outlook/test/v2/node/calendar/getAll.workflow.json'];
	const tests = workflowToTests(workflows);
	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(transport.microsoftApiRequest).toHaveBeenCalledTimes(1);
		expect(transport.microsoftApiRequest).toHaveBeenCalledWith('GET', '/calendars', undefined, {
			$filter: 'canEdit eq true',
			$top: 2,
		});

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => await testNode(testData, nodeTypes));
	}
});
