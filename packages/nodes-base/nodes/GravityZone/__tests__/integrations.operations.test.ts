import type {
	IDataObject,
	IExecuteFunctions,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';

jest.mock('../transport', () => ({
	gravityZoneApiRequest: jest.fn(),
}));

import * as integrations from '../actions/integrations';
import { execute as executeConfigureAmazonEC2IntegrationUsingCrossAccountRole } from '../actions/integrations/configureAmazonEC2IntegrationUsingCrossAccountRole.operation';
import { execute as executeCreateIntegration } from '../actions/integrations/createIntegration.operation';
import { execute as executeDeleteIntegration } from '../actions/integrations/deleteIntegration.operation';
import { execute as executeDisableAmazonEC2Integration } from '../actions/integrations/disableAmazonEC2Integration.operation';
import { execute as executeGenerateAmazonEC2ExternalIdForCrossAccountRole } from '../actions/integrations/generateAmazonEC2ExternalIdForCrossAccountRole.operation';
import { execute as executeGetAmazonEC2ExternalIdForCrossAccountRole } from '../actions/integrations/getAmazonEC2ExternalIdForCrossAccountRole.operation';
import { execute as executeGetConfiguredIntegrations } from '../actions/integrations/getConfiguredIntegrations.operation';
import { execute as executeGetHourlyUsageForAmazonEC2Instances } from '../actions/integrations/getHourlyUsageForAmazonEC2Instances.operation';
import { execute as executeGetIntegrationDetails } from '../actions/integrations/getIntegrationDetails.operation';
import { execute as executeManageIntegration } from '../actions/integrations/manageIntegration.operation';
import { execute as executeUpdateIntegration } from '../actions/integrations/updateIntegration.operation';
import { gravityZoneApiRequest } from '../transport';
import {
	createMockExecuteFunctions,
	getOperationEntries,
	runOperationTest,
	type GravityZoneApiRequest,
} from './operationTestUtils';

const gravityZoneApiRequestMock =
	gravityZoneApiRequest as jest.MockedFunction<GravityZoneApiRequest>;

describe('GravityZone integrations operations', () => {
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

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = createMockExecuteFunctions();
	});

	describe('configureAmazonEC2IntegrationUsingCrossAccountRole', () => {
		it('should include the integration name when provided', async () => {
			stubParameters({
				crossAccountRoleArn: 'arn:aws:iam::123456789012:role/TestRole',
				options: {
					integrationName: 'AWS Integration',
				},
			});

			const apiResult: IDataObject = { configured: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeConfigureAmazonEC2IntegrationUsingCrossAccountRole.call(
				mockExecuteFunctions,
				0,
			);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'configureAmazonEC2IntegrationUsingCrossAccountRole',
				{
					crossAccountRoleArn: 'arn:aws:iam::123456789012:role/TestRole',
					integrationName: 'AWS Integration',
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should default to no options when omitted', async () => {
			stubParameters({
				crossAccountRoleArn: 'arn:aws:iam::123456789012:role/TestRole',
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeConfigureAmazonEC2IntegrationUsingCrossAccountRole.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'configureAmazonEC2IntegrationUsingCrossAccountRole',
				{
					crossAccountRoleArn: 'arn:aws:iam::123456789012:role/TestRole',
				},
			);
		});

		it('should omit integration name when empty', async () => {
			stubParameters({
				crossAccountRoleArn: 'arn:aws:iam::123456789012:role/TestRole',
				options: {
					integrationName: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeConfigureAmazonEC2IntegrationUsingCrossAccountRole.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'configureAmazonEC2IntegrationUsingCrossAccountRole',
				{
					crossAccountRoleArn: 'arn:aws:iam::123456789012:role/TestRole',
				},
			);
		});
	});

	describe('createIntegration', () => {
		it('should build request with parsed specifics JSON', async () => {
			stubParameters({
				name: 'VMware Integration',
				type: 1,
				specificsJson: '{"host":"vcenter.local"}',
			});

			const apiResult: IDataObject = { id: 'integration-1' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateIntegration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('integrations', 'createIntegration', {
				name: 'VMware Integration',
				type: 1,
				specifics: {
					host: 'vcenter.local',
				},
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should accept object input for specifics', async () => {
			stubParameters({
				name: 'VMware Integration',
				type: 1,
				specificsJson: { host: 'vcenter.local' },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateIntegration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('integrations', 'createIntegration', {
				name: 'VMware Integration',
				type: 1,
				specifics: { host: 'vcenter.local' },
			});
		});

		it('should allow an empty specifics JSON object', async () => {
			stubParameters({
				name: 'VMware Integration',
				type: 1,
				specificsJson: '{}',
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateIntegration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('integrations', 'createIntegration', {
				name: 'VMware Integration',
				type: 1,
				specifics: {},
			});
		});

		it('should throw when specificsJson is invalid JSON', async () => {
			stubParameters({
				name: 'VMware Integration',
				type: 1,
				specificsJson: '{not-json',
			});

			await expect(executeCreateIntegration.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when specificsJson is not JSON input', async () => {
			stubParameters({
				name: 'VMware Integration',
				type: 1,
				specificsJson: 42,
			});

			await expect(executeCreateIntegration.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('deleteIntegration', () => {
		it('should send the integration ID', async () => {
			stubParameters({ integrationId: 'integration-123' });

			const apiResult: IDataObject = { deleted: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeDeleteIntegration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('integrations', 'deleteIntegration', {
				integrationId: 'integration-123',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('disableAmazonEC2Integration', () => {
		it('should include options when provided', async () => {
			stubParameters({
				options: {
					companyId: 'company-1',
					integrationName: 'AWS Integration',
				},
			});

			const apiResult: IDataObject = { disabled: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeDisableAmazonEC2Integration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'disableAmazonEC2Integration',
				{
					companyId: 'company-1',
					integrationName: 'AWS Integration',
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should default to empty options when omitted', async () => {
			stubParameters({});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeDisableAmazonEC2Integration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'disableAmazonEC2Integration',
				{},
			);
		});

		it('should include only companyId when integration name is absent', async () => {
			stubParameters({
				options: {
					companyId: 'company-2',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeDisableAmazonEC2Integration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'disableAmazonEC2Integration',
				{
					companyId: 'company-2',
				},
			);
		});

		it('should include only integration name when company ID is absent', async () => {
			stubParameters({
				options: {
					integrationName: 'AWS Integration',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeDisableAmazonEC2Integration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'disableAmazonEC2Integration',
				{
					integrationName: 'AWS Integration',
				},
			);
		});

		it('should omit empty option values', async () => {
			stubParameters({
				options: {
					companyId: '',
					integrationName: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeDisableAmazonEC2Integration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'disableAmazonEC2Integration',
				{},
			);
		});
	});

	describe('generateAmazonEC2ExternalIdForCrossAccountRole', () => {
		it('should request the external ID with empty payload', async () => {
			const apiResult: IDataObject = { externalId: 'external-123' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGenerateAmazonEC2ExternalIdForCrossAccountRole.call(
				mockExecuteFunctions,
				0,
			);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'generateAmazonEC2ExternalIdForCrossAccountRole',
				{},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('getAmazonEC2ExternalIdForCrossAccountRole', () => {
		it('should request the external ID with empty payload', async () => {
			const apiResult: IDataObject = { externalId: 'external-456' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetAmazonEC2ExternalIdForCrossAccountRole.call(
				mockExecuteFunctions,
				0,
			);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'getAmazonEC2ExternalIdForCrossAccountRole',
				{},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('getConfiguredIntegrations', () => {
		it('should include pagination and company options when provided', async () => {
			stubParameters({
				options: {
					companyId: 'company-99',
					page: 2,
					perPage: 25,
				},
			});

			const apiResult: IDataObject = { items: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetConfiguredIntegrations.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'getConfiguredIntegrations',
				{
					companyId: 'company-99',
					page: 2,
					perPage: 25,
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should include only company ID when pagination is omitted', async () => {
			stubParameters({
				options: {
					companyId: 'company-100',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetConfiguredIntegrations.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'getConfiguredIntegrations',
				{
					companyId: 'company-100',
				},
			);
		});

		it('should include only page when perPage is omitted', async () => {
			stubParameters({
				options: {
					page: 4,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetConfiguredIntegrations.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'getConfiguredIntegrations',
				{
					page: 4,
				},
			);
		});

		it('should include only perPage when page is omitted', async () => {
			stubParameters({
				options: {
					perPage: 10,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetConfiguredIntegrations.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'getConfiguredIntegrations',
				{
					perPage: 10,
				},
			);
		});

		it('should omit empty companyId while keeping pagination', async () => {
			stubParameters({
				options: {
					companyId: '',
					page: 3,
					perPage: 50,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetConfiguredIntegrations.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'getConfiguredIntegrations',
				{
					page: 3,
					perPage: 50,
				},
			);
		});

		it('should call API with empty params when no options are provided', async () => {
			stubParameters({ options: {} });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetConfiguredIntegrations.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'getConfiguredIntegrations',
				{},
			);
		});
	});

	describe('getHourlyUsageForAmazonEC2Instances', () => {
		it('should include target month when provided', async () => {
			stubParameters({
				options: {
					targetMonth: '04/2026',
				},
			});

			const apiResult: IDataObject = { usage: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetHourlyUsageForAmazonEC2Instances.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'getHourlyUsageForAmazonEC2Instances',
				{
					targetMonth: '04/2026',
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit target month when empty', async () => {
			stubParameters({
				options: {
					targetMonth: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetHourlyUsageForAmazonEC2Instances.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'getHourlyUsageForAmazonEC2Instances',
				{},
			);
		});

		it('should call API with empty params when no options are provided', async () => {
			stubParameters({ options: {} });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetHourlyUsageForAmazonEC2Instances.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'getHourlyUsageForAmazonEC2Instances',
				{},
			);
		});
	});

	describe('getIntegrationDetails', () => {
		it('should send the integration ID', async () => {
			stubParameters({ integrationId: 'integration-42' });

			const apiResult: IDataObject = { id: 'integration-42' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetIntegrationDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'integrations',
				'getIntegrationDetails',
				{ integrationId: 'integration-42' },
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('manageIntegration', () => {
		it('should send the integration action payload', async () => {
			stubParameters({
				integrationId: 'integration-77',
				integrationAction: 'disable',
			});

			const apiResult: IDataObject = { managed: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeManageIntegration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('integrations', 'manageIntegration', {
				integrationId: 'integration-77',
				action: 'disable',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should send enable action when requested', async () => {
			stubParameters({
				integrationId: 'integration-88',
				integrationAction: 'enable',
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeManageIntegration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('integrations', 'manageIntegration', {
				integrationId: 'integration-88',
				action: 'enable',
			});
		});
	});

	describe('updateIntegration', () => {
		it('should include name and parsed specifics JSON', async () => {
			stubParameters({
				integrationId: 'integration-101',
				options: {
					name: 'Updated Integration',
					specificsJson: '{"region":"us-east-1"}',
				},
			});

			const apiResult: IDataObject = { updated: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeUpdateIntegration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('integrations', 'updateIntegration', {
				integrationId: 'integration-101',
				name: 'Updated Integration',
				specifics: {
					region: 'us-east-1',
				},
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should include name when no specifics are provided', async () => {
			stubParameters({
				integrationId: 'integration-101',
				options: {
					name: 'Updated Integration',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateIntegration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('integrations', 'updateIntegration', {
				integrationId: 'integration-101',
				name: 'Updated Integration',
			});
		});

		it('should accept specifics object input', async () => {
			stubParameters({
				integrationId: 'integration-101',
				options: {
					specificsJson: { region: 'us-east-1' },
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateIntegration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('integrations', 'updateIntegration', {
				integrationId: 'integration-101',
				specifics: { region: 'us-east-1' },
			});
		});

		it('should ignore empty name when specifics are provided', async () => {
			stubParameters({
				integrationId: 'integration-101',
				options: {
					name: '',
					specificsJson: { region: 'us-west-1' },
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateIntegration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('integrations', 'updateIntegration', {
				integrationId: 'integration-101',
				specifics: { region: 'us-west-1' },
			});
		});

		it('should omit specifics when specifics object is empty', async () => {
			stubParameters({
				integrationId: 'integration-101',
				options: {
					specificsJson: {},
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateIntegration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('integrations', 'updateIntegration', {
				integrationId: 'integration-101',
			});
		});

		it('should omit specifics when JSON is empty', async () => {
			stubParameters({
				integrationId: 'integration-101',
				options: {
					name: 'Updated Integration',
					specificsJson: '{}',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateIntegration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('integrations', 'updateIntegration', {
				integrationId: 'integration-101',
				name: 'Updated Integration',
			});
		});

		it('should call API with integrationId when no options are provided', async () => {
			stubParameters({ integrationId: 'integration-101', options: {} });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateIntegration.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('integrations', 'updateIntegration', {
				integrationId: 'integration-101',
			});
		});

		it('should throw when specificsJson is invalid JSON', async () => {
			stubParameters({
				integrationId: 'integration-101',
				options: {
					specificsJson: '{not-json',
				},
			});

			await expect(executeUpdateIntegration.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when specificsJson is not JSON input', async () => {
			stubParameters({
				integrationId: 'integration-101',
				options: {
					specificsJson: 0,
				},
			});

			await expect(executeUpdateIntegration.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('action description', () => {
		it('should list every integration action in the action options', () => {
			const actionProperty = integrations.description.find(
				(property) => property.name === 'action',
			);

			expect(actionProperty?.default).toBe('getConfiguredIntegrations');
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

			expect(optionValues.sort()).toEqual(
				[
					'configureAmazonEC2IntegrationUsingCrossAccountRole',
					'createIntegration',
					'deleteIntegration',
					'disableAmazonEC2Integration',
					'generateAmazonEC2ExternalIdForCrossAccountRole',
					'getAmazonEC2ExternalIdForCrossAccountRole',
					'getConfiguredIntegrations',
					'getHourlyUsageForAmazonEC2Instances',
					'getIntegrationDetails',
					'manageIntegration',
					'updateIntegration',
				].sort(),
			);
		});
	});

	describe('operation exports', () => {
		const operations = getOperationEntries(integrations as Record<string, unknown>);

		it('should include all integration operations', () => {
			const operationNames = operations.map(({ name }) => name).sort();

			expect(operationNames).toEqual(
				[
					'configureAmazonEC2IntegrationUsingCrossAccountRole',
					'createIntegration',
					'deleteIntegration',
					'disableAmazonEC2Integration',
					'generateAmazonEC2ExternalIdForCrossAccountRole',
					'getAmazonEC2ExternalIdForCrossAccountRole',
					'getConfiguredIntegrations',
					'getHourlyUsageForAmazonEC2Instances',
					'getIntegrationDetails',
					'manageIntegration',
					'updateIntegration',
				].sort(),
			);
		});

		for (const { name, module } of operations) {
			it(`executes ${name}`, async () => {
				await runOperationTest(name, module, mockExecuteFunctions, gravityZoneApiRequestMock);
			});
		}
	});
});
