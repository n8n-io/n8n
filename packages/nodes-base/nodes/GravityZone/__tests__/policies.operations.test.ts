import { readdirSync } from 'fs';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';
import * as path from 'path';

import {
	createMockExecuteFunctions,
	getOperationEntries,
	runOperationTest,
	type GravityZoneApiRequest,
} from './operationTestUtils';
import * as policies from '../actions/policies';
import { execute as executeGetPoliciesList } from '../actions/policies/getPoliciesList.operation';
import { execute as executeGetPolicyDetails } from '../actions/policies/getPolicyDetails.operation';
import { execute as executeSetPolicyModulesState } from '../actions/policies/setPolicyModulesState.operation';
import { gravityZoneApiRequest } from '../transport';

jest.mock('../transport', () => ({
	gravityZoneApiRequest: jest.fn(),
}));

const gravityZoneApiRequestMock =
	gravityZoneApiRequest as jest.MockedFunction<GravityZoneApiRequest>;

describe('GravityZone policies operations', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	const expectDisplayOptions = (description: INodeProperties[], action: string) => {
		for (const property of description) {
			expect(property.displayOptions?.show?.category).toEqual(['policies']);
			expect(property.displayOptions?.show?.action).toEqual([action]);
		}
	};

	const stubParameters = (params: Record<string, NodeParameterValueType | object>) => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(paramName: string, _itemIndex: number, defaultValue?: unknown) => {
				if (Object.prototype.hasOwnProperty.call(params, paramName)) {
					return params[paramName];
				}

				return defaultValue as NodeParameterValueType | object | undefined;
			},
		);
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = createMockExecuteFunctions();
	});

	describe('getPoliciesList', () => {
		it('includes pagination when provided', async () => {
			stubParameters({
				options: {
					page: 2,
					perPage: 25,
				},
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetPoliciesList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('policies', 'getPoliciesList', {
				page: 2,
				perPage: 25,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('includes only page when perPage is omitted', async () => {
			stubParameters({
				options: {
					page: 3,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetPoliciesList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('policies', 'getPoliciesList', {
				page: 3,
			});
		});

		it('includes only perPage when page is omitted', async () => {
			stubParameters({
				options: {
					perPage: 100,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetPoliciesList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('policies', 'getPoliciesList', {
				perPage: 100,
			});
		});

		it('ignores unknown option fields', async () => {
			stubParameters({
				options: {
					page: 4,
					perPage: 20,
					unexpected: 'ignore-me',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetPoliciesList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('policies', 'getPoliciesList', {
				page: 4,
				perPage: 20,
			});
		});

		it('omits pagination when options are not provided', async () => {
			stubParameters({});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetPoliciesList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('policies', 'getPoliciesList', {});
		});
	});

	describe('getPolicyDetails', () => {
		it('sends the policy ID using the v1.1 endpoint', async () => {
			stubParameters({ policyId: 'policy-123' });

			const apiResult: IDataObject = { id: 'policy-123' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetPolicyDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'policies',
				'getPolicyDetails',
				{ policyId: 'policy-123' },
				'v1.1',
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('setPolicyModulesState', () => {
		it('parses JSON settings and sends the payload', async () => {
			stubParameters({
				policyId: 'policy-321',
				settings: '{"firewall":true}',
			});

			const apiResult: IDataObject = { updated: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeSetPolicyModulesState.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('policies', 'setPolicyModulesState', {
				policyId: 'policy-321',
				settings: { firewall: true },
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('accepts object settings', async () => {
			stubParameters({
				policyId: 'policy-654',
				settings: { antimalware: false },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeSetPolicyModulesState.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('policies', 'setPolicyModulesState', {
				policyId: 'policy-654',
				settings: { antimalware: false },
			});
		});

		it('throws when settings are invalid JSON', async () => {
			stubParameters({
				policyId: 'policy-999',
				settings: '{invalid-json',
			});

			await expect(executeSetPolicyModulesState.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Settings'.*valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('throws when settings are not JSON input', async () => {
			stubParameters({
				policyId: 'policy-1000',
				settings: 42,
			});

			await expect(executeSetPolicyModulesState.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Settings'.*valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('display options', () => {
		it('applies policies display options to getPoliciesList fields', () => {
			expectDisplayOptions(policies.getPoliciesList.description, 'getPoliciesList');
		});

		it('applies policies display options to getPolicyDetails fields', () => {
			expectDisplayOptions(policies.getPolicyDetails.description, 'getPolicyDetails');
		});

		it('applies policies display options to setPolicyModulesState fields', () => {
			expectDisplayOptions(policies.setPolicyModulesState.description, 'setPolicyModulesState');
		});
	});

	describe('action description', () => {
		it('lists policies actions in the action options', () => {
			const actionProperty = policies.description.find((property) => property.name === 'action');

			expect(actionProperty?.default).toBe('getPoliciesList');
			expect(actionProperty?.type).toBe('options');

			const optionValues = Array.isArray(actionProperty?.options)
				? actionProperty.options
						.filter(
							(option): option is INodePropertyOptions =>
								typeof option === 'object' && option !== null && 'value' in option,
						)
						.map((option) => option.value)
						.filter((value): value is string => typeof value === 'string')
				: [];

			expect(optionValues).toEqual([
				'getPoliciesList',
				'getPolicyDetails',
				'setPolicyModulesState',
			]);
		});
	});

	describe('operation exports', () => {
		const operations = getOperationEntries(policies as Record<string, unknown>);

		it('includes all policies operation files', () => {
			const actionsDir = path.join(__dirname, '../actions/policies');

			const operationFiles = readdirSync(actionsDir).filter(
				(file) => file.endsWith('.operation.ts') || file.endsWith('.operation.js'),
			);

			const expected = operationFiles
				.map((file) => file.replace(/\.operation\.(ts|js)$/, ''))
				.sort();

			const exported = operations.map(({ name }) => name).sort();

			expect(exported).toEqual(expected);
		});

		for (const { name, module } of operations) {
			it(`executes ${name}`, async () => {
				await runOperationTest(name, module, mockExecuteFunctions, gravityZoneApiRequestMock);
			});
		}
	});
});
