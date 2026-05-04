import type { INodeProperties } from 'n8n-workflow';

import * as configureAmazonEC2IntegrationUsingCrossAccountRole from './configureAmazonEC2IntegrationUsingCrossAccountRole.operation';
import * as createIntegration from './createIntegration.operation';
import * as deleteIntegration from './deleteIntegration.operation';
import * as disableAmazonEC2Integration from './disableAmazonEC2Integration.operation';
import * as generateAmazonEC2ExternalIdForCrossAccountRole from './generateAmazonEC2ExternalIdForCrossAccountRole.operation';
import * as getAmazonEC2ExternalIdForCrossAccountRole from './getAmazonEC2ExternalIdForCrossAccountRole.operation';
import * as getConfiguredIntegrations from './getConfiguredIntegrations.operation';
import * as getHourlyUsageForAmazonEC2Instances from './getHourlyUsageForAmazonEC2Instances.operation';
import * as getIntegrationDetails from './getIntegrationDetails.operation';
import * as manageIntegration from './manageIntegration.operation';
import * as updateIntegration from './updateIntegration.operation';

export {
	configureAmazonEC2IntegrationUsingCrossAccountRole,
	createIntegration,
	deleteIntegration,
	disableAmazonEC2Integration,
	generateAmazonEC2ExternalIdForCrossAccountRole,
	getAmazonEC2ExternalIdForCrossAccountRole,
	getConfiguredIntegrations,
	getHourlyUsageForAmazonEC2Instances,
	getIntegrationDetails,
	manageIntegration,
	updateIntegration,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { category: ['integrations'] } },
		options: [
			{
				name: 'Configure Amazon EC2 Integration Using Cross-Account Role',
				value: 'configureAmazonEC2IntegrationUsingCrossAccountRole',
				action: 'Configure Amazon EC2 integration using a cross-account role',
			},
			{
				name: 'Create Integration',
				value: 'createIntegration',
				action: 'Create a new integration',
			},
			{
				name: 'Delete Integration',
				value: 'deleteIntegration',
				action: 'Delete an integration',
			},
			{
				name: 'Disable Amazon EC2 Integration',
				value: 'disableAmazonEC2Integration',
				action: 'Disable Amazon EC2 integration',
			},
			{
				name: 'Generate Amazon EC2 External ID for Cross-Account Role',
				value: 'generateAmazonEC2ExternalIdForCrossAccountRole',
				action: 'Generate the external ID for AWS cross-account role',
			},
			{
				name: 'Get Amazon EC2 External ID for Cross-Account Role',
				value: 'getAmazonEC2ExternalIdForCrossAccountRole',
				action: 'Get the external ID for AWS cross-account role',
			},
			{
				name: 'Get Configured Integrations',
				value: 'getConfiguredIntegrations',
				action: 'Get all integrations configured on a company',
			},
			{
				name: 'Get Hourly Usage for Amazon EC2 Instances',
				value: 'getHourlyUsageForAmazonEC2Instances',
				action: 'Get hourly usage for Amazon EC2 instances',
			},
			{
				name: 'Get Integration Details',
				value: 'getIntegrationDetails',
				action: 'Get details of an integration',
			},
			{
				name: 'Manage Integration',
				value: 'manageIntegration',
				action: 'Enable or disable an integration',
			},
			{
				name: 'Update Integration',
				value: 'updateIntegration',
				action: 'Update an integration',
			},
		],
		default: 'getConfiguredIntegrations',
	},
	...configureAmazonEC2IntegrationUsingCrossAccountRole.description,
	...createIntegration.description,
	...deleteIntegration.description,
	...disableAmazonEC2Integration.description,
	...generateAmazonEC2ExternalIdForCrossAccountRole.description,
	...getAmazonEC2ExternalIdForCrossAccountRole.description,
	...getConfiguredIntegrations.description,
	...getHourlyUsageForAmazonEC2Instances.description,
	...getIntegrationDetails.description,
	...manageIntegration.description,
	...updateIntegration.description,
];
