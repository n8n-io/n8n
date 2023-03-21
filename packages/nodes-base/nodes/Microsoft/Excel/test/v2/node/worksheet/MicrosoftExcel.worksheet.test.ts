import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { setup, equalityTest, workflowToTests } from '../../../../../../../test/nodes/Helpers';

import * as _transport from '../../../../v2/transport';

import nock from 'nock';

let apiRequest: any = async (method: string, resource: string) =>
	Promise.resolve({
		values: [method, resource],
	});

const apiRequestAllItems: any = async (method: string, endpoint: string) =>
	Promise.resolve({
		values: [method, endpoint],
	});

const apiRequestAllItemsSkip: any = async (method: string, endpoint: string) =>
	Promise.resolve({
		values: [method, endpoint],
	});

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: jest.fn(async function (
			this: IExecuteFunctions,
			method: string,
			resource: string,
			_body: any = {},
			_qs: IDataObject = {},
			uri?: string,
			_headers: IDataObject = {},
		) {
			return apiRequest(method, resource);
		}),
		microsoftApiRequestAllItems: jest.fn(async function (
			this: IExecuteFunctions,
			propertyName: string,
			method: string,
			endpoint: string,
			_body: any = {},
			_query: IDataObject = {},
		) {
			return apiRequestAllItems(method, endpoint);
		}),
		microsoftApiRequestAllItemsSkip: jest.fn(async function (
			this: IExecuteFunctions,
			propertyName: string,
			method: string,
			endpoint: string,
			_body: any = {},
			_query: IDataObject = {},
		) {
			return apiRequestAllItemsSkip(method, endpoint);
		}),
	};
});

describe('Test MicrosoftExcelV2, worksheet => readRows', () => {
	const workflows = ['nodes/Microsoft/Excel/test/v2/node/worksheet/workflow.readRows.json'];
	const tests = workflowToTests(workflows);

	apiRequest = async (method: string, resource: string) => {
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
	};

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	const nodeTypes = setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => equalityTest(testData, nodeTypes));
	}
});
