import type { INodeTypes } from 'n8n-workflow';

import nock from 'nock';
import * as transport from '../../../../v2/transport';
import { getResultNodeData, setup, workflowToTests } from '@test/nodes/Helpers';
import type { WorkflowTestData } from '@test/nodes/types';
import { executeWorkflow } from '@test/nodes/ExecuteWorkflow';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: jest.fn(async function (method: string) {
			if (method === 'PATCH') {
				return {
					'@odata.context':
						"https://graph.microsoft.com/v1.0/$metadata#users('b834447b-6848-4af9-8390-d2259ce46b74')/calendars/$entity",
					id: 'AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAACLtRvGAAA=',
					name: 'Foo',
					color: 'lightOrange',
					hexColor: '#fcab73',
					isDefaultCalendar: false,
					changeKey: 'WX+A3vy5K0qqTyPHso1JgAABVtwYKA==',
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

describe('Test MicrosoftOutlookV2, calendar => update', () => {
	const workflows = ['nodes/Microsoft/Outlook/test/v2/node/calendar/update.workflow.json'];
	const tests = workflowToTests(workflows);

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../../v2/transport');
	});

	const nodeTypes = setup(tests);

	const testNode = async (testData: WorkflowTestData, types: INodeTypes) => {
		const { result } = await executeWorkflow(testData, types);

		const resultNodeData = getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) => {
			return expect(resultData).toEqual(testData.output.nodeData[nodeName]);
		});

		expect(transport.microsoftApiRequest).toHaveBeenCalledTimes(1);
		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'PATCH',
			'/calendars/AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAACLtRvGAAA=',
			{ color: 'lightOrange', isDefaultCalendar: false, name: 'Foo' },
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => testNode(testData, nodeTypes));
	}
});
