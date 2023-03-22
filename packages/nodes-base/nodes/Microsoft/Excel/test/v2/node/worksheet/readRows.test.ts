import { equalityTest, setup, workflowToTests } from '../../../../../../../test/nodes/Helpers';

import * as _transport from '../../../../v2/transport';

import nock from 'nock';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: jest.fn(async function (method: string, resource: string) {
			{
				if (method === 'GET' && resource.includes('usedRange')) {
					return Promise.resolve({
						values: [
							['id', 'name', 'age', 'data'],
							[1, 'Sam', 33, 'data 1'],
							[2, 'Jon', 44, 'data 2'],
							[3, 'Ron', 55, 'data 3'],
						],
					});
				}

				return Promise.resolve({
					values: [
						['id', 'name', 'age', 'data'],
						[1, 'Sam', 33, 'data 1'],
						[2, 'Jon', 44, 'data 2'],
					],
				});
			}
		}),
	};
});

describe('Test MicrosoftExcelV2, worksheet => readRows', () => {
	const workflows = ['nodes/Microsoft/Excel/test/v2/node/worksheet/readRows.workflow.json'];
	const tests = workflowToTests(workflows);

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../../v2/transport');
	});

	const nodeTypes = setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => equalityTest(testData, nodeTypes));
	}
});
