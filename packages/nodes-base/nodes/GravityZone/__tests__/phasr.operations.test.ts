import { readdirSync } from 'fs';
import type {
	IDataObject,
	IExecuteFunctions,
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
import * as phasr from '../actions/phasr';
import { execute as executeApplyRecommendations } from '../actions/phasr/applyRecommendations.operation';
import { execute as executeEditMonitoredRulesAccess } from '../actions/phasr/editMonitoredRulesAccess.operation';
import { execute as executeGetAllCompanyIdentities } from '../actions/phasr/getAllCompanyIdentities.operation';
import { execute as executeGetAllCompanyResources } from '../actions/phasr/getAllCompanyResources.operation';
import { execute as executeGetMonitoredRuleData } from '../actions/phasr/getMonitoredRuleData.operation';
import { execute as executeGetMonitoredRules } from '../actions/phasr/getMonitoredRules.operation';
import { execute as executeGetPhasrRecommendations } from '../actions/phasr/getPhasrRecommendations.operation';
import { execute as executeGetRecommendationProfiles } from '../actions/phasr/getRecommendationProfiles.operation';
import { execute as executeTakeRequestAccessAction } from '../actions/phasr/takeRequestAccessAction.operation';
import { gravityZoneApiRequest } from '../transport';

jest.mock('../transport', () => ({
	gravityZoneApiRequest: jest.fn(),
}));

const gravityZoneApiRequestMock =
	gravityZoneApiRequest as jest.MockedFunction<GravityZoneApiRequest>;

describe('GravityZone phasr operations', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

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

	const wrapExecutionData = (data: IDataObject | IDataObject[]) =>
		(Array.isArray(data) ? data : [data]).map((item) => ({ json: item }));

	const wrapPairedExecutionData = (data: IDataObject | IDataObject[], itemIndex: number) =>
		wrapExecutionData(data).map((item) => ({
			...item,
			pairedItem: { item: itemIndex },
		}));

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = createMockExecuteFunctions();
	});

	describe('getPhasrRecommendations', () => {
		it('sends empty params when no filters are provided', async () => {
			stubParameters({ options: {} });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetPhasrRecommendations.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'phasr',
				'getPhasrRecommendations',
				{},
			);
		});

		it('omits empty list filters while keeping pagination', async () => {
			stubParameters({
				options: {
					ruleIds: '',
					categoryIds: [],
					actionTaken: [],
					type: [],
					behavioralProfileIdentities: '',
					behavioralProfileResources: '',
					page: 4,
					perPage: 100,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetPhasrRecommendations.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getPhasrRecommendations', {
				page: 4,
				perPage: 100,
			});
		});

		it('builds params with list filters and pagination', async () => {
			stubParameters({
				options: {
					objectId: 'rec-123',
					sort: 'attackSurfaceReduction',
					dir: 'DESC',
					createdOnMin: '2025-05-07T13:21:00.704Z',
					createdOnMax: '2025-05-08T13:21:00.704Z',
					page: 2,
					perPage: 25,
					ruleIds: '696-0, 596-1, ',
					categoryIds: [2, 5],
					actionTaken: [0, 2],
					type: [1],
					behavioralProfileIdentities: 'identity-1, identity-2,',
					behavioralProfileResources: 'resource-1, resource-2',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetPhasrRecommendations.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getPhasrRecommendations', {
				objectId: 'rec-123',
				sort: 'attackSurfaceReduction',
				dir: 'DESC',
				createdOnMin: '2025-05-07T13:21:00.704Z',
				createdOnMax: '2025-05-08T13:21:00.704Z',
				page: 2,
				perPage: 25,
				ruleIds: ['696-0', '596-1'],
				categoryIds: [2, 5],
				actionTaken: [0, 2],
				type: [1],
				behavioralProfileIdentities: ['identity-1', 'identity-2'],
				behavioralProfileResources: ['resource-1', 'resource-2'],
			});
		});

		it('wraps array responses with paired item data', async () => {
			stubParameters({ options: {} });

			const apiResult = [{ id: 'rec-1' }, { id: 'rec-2' }] as IDataObject[];

			gravityZoneApiRequestMock.mockResolvedValue(apiResult as unknown as IDataObject);

			const constructExecutionMetaDataMock = jest.spyOn(
				mockExecuteFunctions.helpers,
				'constructExecutionMetaData',
			);

			const result = await executeGetPhasrRecommendations.call(mockExecuteFunctions, 3);

			expect(constructExecutionMetaDataMock).toHaveBeenCalledWith(wrapExecutionData(apiResult), {
				itemData: { item: 3 },
			});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 3));
		});
	});

	describe('getRecommendationProfiles', () => {
		it('includes object ID and options in the request payload', async () => {
			stubParameters({
				objectId: 'rec-456',
				options: { companyId: 'comp-1', page: 4, perPage: 20 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetRecommendationProfiles.call(mockExecuteFunctions, 1);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getRecommendationProfiles', {
				objectId: 'rec-456',
				companyId: 'comp-1',
				page: 4,
				perPage: 20,
			});
		});

		it('omits empty company ID while keeping pagination', async () => {
			stubParameters({
				objectId: 'rec-900',
				options: { companyId: '', page: 3, perPage: 15 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetRecommendationProfiles.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getRecommendationProfiles', {
				objectId: 'rec-900',
				page: 3,
				perPage: 15,
			});
		});

		it('sends only the required object ID when options are empty', async () => {
			stubParameters({ objectId: 'rec-789' });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetRecommendationProfiles.call(mockExecuteFunctions, 2);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getRecommendationProfiles', {
				objectId: 'rec-789',
			});
		});
	});

	describe('getMonitoredRules', () => {
		it('sends categories and pagination settings', async () => {
			stubParameters({
				options: { categories: [1, 3], page: 2, perPage: 10 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMonitoredRules.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getMonitoredRules', {
				categories: [1, 3],
				page: 2,
				perPage: 10,
			});
		});

		it('includes pagination without category filters', async () => {
			stubParameters({
				options: { categories: [], page: 3, perPage: 25 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMonitoredRules.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getMonitoredRules', {
				page: 3,
				perPage: 25,
			});
		});

		it('sends empty params when options are not set', async () => {
			stubParameters({ options: {} });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMonitoredRules.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getMonitoredRules', {});
		});
	});

	describe('getMonitoredRuleData', () => {
		it('builds params with rule ID and selected options', async () => {
			stubParameters({
				ruleId: 42,
				options: { companyId: 'comp-2', profileType: 3, page: 5, perPage: 15 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMonitoredRuleData.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getMonitoredRuleData', {
				ruleId: 42,
				companyId: 'comp-2',
				profileType: 3,
				page: 5,
				perPage: 15,
			});
		});

		it('includes pagination without company or profile filters', async () => {
			stubParameters({
				ruleId: 88,
				options: { page: 2, perPage: 30 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMonitoredRuleData.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getMonitoredRuleData', {
				ruleId: 88,
				page: 2,
				perPage: 30,
			});
		});

		it('sends only the rule ID when options are empty', async () => {
			stubParameters({ ruleId: 17 });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetMonitoredRuleData.call(mockExecuteFunctions, 1);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getMonitoredRuleData', {
				ruleId: 17,
			});
		});
	});

	describe('applyRecommendations', () => {
		it('parses recommendation IDs and includes pagination', async () => {
			stubParameters({
				recommendationIds: 'rec-1, rec-2, , rec-3',
				options: { page: 3, perPage: 80 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeApplyRecommendations.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'applyRecommendations', {
				recommendationIds: ['rec-1', 'rec-2', 'rec-3'],
				page: 3,
				perPage: 80,
			});
		});

		it('sends only recommendation IDs when options are empty', async () => {
			stubParameters({
				recommendationIds: 'rec-9, rec-10',
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeApplyRecommendations.call(mockExecuteFunctions, 1);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'applyRecommendations', {
				recommendationIds: ['rec-9', 'rec-10'],
			});
		});
	});

	describe('editMonitoredRulesAccess', () => {
		it('includes rule actions, targets, and options', async () => {
			stubParameters({
				ruleId: 99,
				actionValue: 1,
				targets: 'profile-1, profile-2,',
				options: { companyId: 'comp-3', targetType: 0 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeEditMonitoredRulesAccess.call(mockExecuteFunctions, 2);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'editMonitoredRulesAccess', {
				ruleId: 99,
				action: 1,
				targets: ['profile-1', 'profile-2'],
				companyId: 'comp-3',
				targetType: 0,
			});
		});

		it('omits empty company ID while keeping target type', async () => {
			stubParameters({
				ruleId: 77,
				actionValue: 1,
				targets: 'profile-11',
				options: { companyId: '', targetType: 0 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeEditMonitoredRulesAccess.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'editMonitoredRulesAccess', {
				ruleId: 77,
				action: 1,
				targets: ['profile-11'],
				targetType: 0,
			});
		});

		it('sends required rule inputs when options are empty', async () => {
			stubParameters({
				ruleId: 55,
				actionValue: 0,
				targets: 'profile-9, profile-10',
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeEditMonitoredRulesAccess.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'editMonitoredRulesAccess', {
				ruleId: 55,
				action: 0,
				targets: ['profile-9', 'profile-10'],
			});
		});
	});

	describe('getAllCompanyResources', () => {
		it('passes search and pagination parameters', async () => {
			stubParameters({
				options: { searchString: 'server', page: 2, perPage: 40 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetAllCompanyResources.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getAllCompanyResources', {
				searchString: 'server',
				page: 2,
				perPage: 40,
			});
		});

		it('includes pagination without search input', async () => {
			stubParameters({
				options: { searchString: '', page: 5, perPage: 70 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetAllCompanyResources.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getAllCompanyResources', {
				page: 5,
				perPage: 70,
			});
		});

		it('sends empty params when no options are provided', async () => {
			stubParameters({ options: {} });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetAllCompanyResources.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getAllCompanyResources', {});
		});
	});

	describe('getAllCompanyIdentities', () => {
		it('passes search and pagination parameters', async () => {
			stubParameters({
				options: { searchString: 'alice', page: 6, perPage: 35 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetAllCompanyIdentities.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getAllCompanyIdentities', {
				searchString: 'alice',
				page: 6,
				perPage: 35,
			});
		});

		it('includes pagination without search input', async () => {
			stubParameters({
				options: { searchString: '', page: 4, perPage: 90 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetAllCompanyIdentities.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'getAllCompanyIdentities', {
				page: 4,
				perPage: 90,
			});
		});

		it('sends empty params when no options are provided', async () => {
			stubParameters({ options: {} });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetAllCompanyIdentities.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'phasr',
				'getAllCompanyIdentities',
				{},
			);
		});
	});

	describe('takeRequestAccessAction', () => {
		it('parses recommendation IDs and action selection', async () => {
			stubParameters({
				recommendationIds: 'req-1, req-2,',
				actionValue: 'deny',
				options: { page: 2, perPage: 100 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeTakeRequestAccessAction.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'takeRequestAccessAction', {
				recommendationIds: ['req-1', 'req-2'],
				action: 'deny',
				page: 2,
				perPage: 100,
			});
		});

		it('sends only required parameters when options are empty', async () => {
			stubParameters({
				recommendationIds: 'req-5, req-6',
				actionValue: 'allow',
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeTakeRequestAccessAction.call(mockExecuteFunctions, 2);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('phasr', 'takeRequestAccessAction', {
				recommendationIds: ['req-5', 'req-6'],
				action: 'allow',
			});
		});
	});

	describe('action description', () => {
		it('lists phasr actions in the action options', () => {
			const actionProperty = phasr.description.find((property) => property.name === 'action');

			expect(actionProperty?.default).toBe('getMonitoredRules');
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
				'applyRecommendations',
				'editMonitoredRulesAccess',
				'getAllCompanyIdentities',
				'getAllCompanyResources',
				'getMonitoredRuleData',
				'getMonitoredRules',
				'getPhasrRecommendations',
				'getRecommendationProfiles',
				'takeRequestAccessAction',
			]);
		});
	});

	describe('operation exports', () => {
		const operations = getOperationEntries(phasr as Record<string, unknown>);

		it('includes all phasr operation files', () => {
			const actionsDir = path.join(__dirname, '../actions/phasr');

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
