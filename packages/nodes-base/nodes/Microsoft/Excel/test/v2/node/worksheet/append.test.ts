/* eslint-disable @typescript-eslint/no-unused-vars */
import type { IDataObject } from 'n8n-workflow';

import { equalityTest, setup, workflowToTests } from '../../../../../../../test/nodes/Helpers';

// eslint-disable-next-line unused-imports/no-unused-imports
import * as transport from '../../../../v2/transport';

import nock from 'nock';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: jest.fn(async function (
			method: string,
			resource: string,
			body?: IDataObject,
			qs?: IDataObject,
			uri?: string,
			headers?: IDataObject,
		) {
			if (method === 'GET' && resource.includes('usedRange')) {
				return {
					address: 'Sheet4!A1:D6',
					values: [
						['id', 'name', 'age', 'data'],
						[1, 'Sam', 33, 'data 1'],
						[2, 'Jon', 44, 'data 2'],
						[3, 'Ron', 55, 'data 3'],
					],
				};
			}

			if (method === 'PATCH' && resource.includes('{A0883CFE-D27E-4ECC-B94B-981830AAD55B}')) {
				return {
					values: [[4, 'Sam', 34, 'data 4']],
				};
			}

			if (method === 'PATCH' && resource.includes('{426949D7-797F-43A9-A8A4-8FE283495A82}')) {
				return {
					values: [[4, 'Don', 37, 'data 44']],
				};
			}
		}),
	};
});

describe('Test MicrosoftExcelV2, worksheet => append', () => {
	const workflows = ['nodes/Microsoft/Excel/test/v2/node/worksheet/append.workflow.json'];
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
