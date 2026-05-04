import type { INodeProperties } from 'n8n-workflow';

import * as addIntegrators from './addIntegrators.operation';
import * as assignPolicy from './assignPolicy.operation';
import * as createCustomGroup from './createCustomGroup.operation';
import * as createReconfigureClientTask from './createReconfigureClientTask.operation';
import * as createScanTask from './createScanTask.operation';
import * as createScanTaskByMac from './createScanTaskByMac.operation';
import * as createSubmitToSandboxAnalyzerTask from './createSubmitToSandboxAnalyzerTask.operation';
import * as deleteCustomGroup from './deleteCustomGroup.operation';
import * as deleteEndpoint from './deleteEndpoint.operation';
import * as deleteTask from './deleteTask.operation';
import * as getCustomGroupsList from './getCustomGroupsList.operation';
import * as getEndpointsList from './getEndpointsList.operation';
import * as getIntegrators from './getIntegrators.operation';
import * as getManagedEndpointDetails from './getManagedEndpointDetails.operation';
import * as getNetworkInventoryItems from './getNetworkInventoryItems.operation';
import * as getScanTasksList from './getScanTasksList.operation';
import * as getTaskStatus from './getTaskStatus.operation';
import * as killProcess from './killProcess.operation';
import * as moveCustomGroup from './moveCustomGroup.operation';
import * as moveEndpoints from './moveEndpoints.operation';
import * as removeIntegrators from './removeIntegrators.operation';
import * as runLiveSearchQuery from './runLiveSearchQuery.operation';
import * as setEndpointLabel from './setEndpointLabel.operation';

export {
	assignPolicy,
	getEndpointsList,
	getManagedEndpointDetails,
	createCustomGroup,
	deleteCustomGroup,
	moveCustomGroup,
	getCustomGroupsList,
	killProcess,
	createSubmitToSandboxAnalyzerTask,
	moveEndpoints,
	deleteEndpoint,
	setEndpointLabel,
	getNetworkInventoryItems,
	createScanTask,
	createReconfigureClientTask,
	createScanTaskByMac,
	getScanTasksList,
	getTaskStatus,
	deleteTask,
	runLiveSearchQuery,
	addIntegrators,
	getIntegrators,
	removeIntegrators,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		required: true,
		default: 'getEndpointsList',
		displayOptions: {
			show: { category: ['network'] },
		},
		options: [
			{
				name: 'Add Integrators',
				value: 'addIntegrators',
				action: 'Assign endpoint as integrator',
			},
			{
				name: 'Assign Policy',
				value: 'assignPolicy',
				action: 'Assign a policy to endpoints',
			},
			{
				name: 'Create Custom Group',
				value: 'createCustomGroup',
				action: 'Create a custom group',
			},
			{
				name: 'Create Reconfigure Client Task',
				value: 'createReconfigureClientTask',
				action: 'Create a reconfigure agent task',
			},
			{
				name: 'Create Scan Task',
				value: 'createScanTask',
				action: 'Create a scan task for endpoints',
			},
			{
				name: 'Create Scan Task by MAC',
				value: 'createScanTaskByMac',
				action: 'Create scan tasks by MAC address',
			},
			{
				name: 'Create Submit to Sandbox Analyzer Task',
				value: 'createSubmitToSandboxAnalyzerTask',
				action: 'Submit files to Sandbox Analyzer for analysis',
			},
			{
				name: 'Delete Custom Group',
				value: 'deleteCustomGroup',
				action: 'Delete a custom group',
			},
			{
				name: 'Delete Endpoint',
				value: 'deleteEndpoint',
				action: 'Delete an endpoint',
			},
			{
				name: 'Delete Task',
				value: 'deleteTask',
				action: 'Delete a task',
			},
			{
				name: 'Get Custom Groups List',
				value: 'getCustomGroupsList',
				action: 'Get list of groups under a specified group',
			},
			{
				name: 'Get Endpoints List',
				value: 'getEndpointsList',
				action: 'Get list of endpoints',
			},
			{
				name: 'Get Integrators',
				value: 'getIntegrators',
				action: 'Get list of integrators for an integration',
			},
			{
				name: 'Get Managed Endpoint Details',
				value: 'getManagedEndpointDetails',
				action: 'Get details of a managed endpoint',
			},
			{
				name: 'Get Network Inventory Items',
				value: 'getNetworkInventoryItems',
				action: 'Get network inventory items',
			},
			{
				name: 'Get Scan Tasks List',
				value: 'getScanTasksList',
				action: 'Get list of scan tasks',
			},
			{
				name: 'Get Task Status',
				value: 'getTaskStatus',
				action: 'Get status of a task',
			},
			{
				name: 'Kill Process',
				value: 'killProcess',
				action: 'Terminate an active process on an endpoint',
			},
			{
				name: 'Move Custom Group',
				value: 'moveCustomGroup',
				action: 'Move a custom group under another group',
			},
			{
				name: 'Move Endpoints',
				value: 'moveEndpoints',
				action: 'Move endpoints to a group',
			},
			{
				name: 'Remove Integrators',
				value: 'removeIntegrators',
				action: 'Unassign endpoint as integrator',
			},
			{
				name: 'Run Live Search Query',
				value: 'runLiveSearchQuery',
				action: 'Run an OSQuery live search on endpoints',
			},
			{
				name: 'Set Endpoint Label',
				value: 'setEndpointLabel',
				action: 'Set label for an endpoint',
			},
		],
	},
	...assignPolicy.description,
	...getEndpointsList.description,
	...getManagedEndpointDetails.description,
	...createCustomGroup.description,
	...deleteCustomGroup.description,
	...moveCustomGroup.description,
	...getCustomGroupsList.description,
	...killProcess.description,
	...createSubmitToSandboxAnalyzerTask.description,
	...moveEndpoints.description,
	...deleteEndpoint.description,
	...setEndpointLabel.description,
	...getNetworkInventoryItems.description,
	...createScanTask.description,
	...createReconfigureClientTask.description,
	...createScanTaskByMac.description,
	...getScanTasksList.description,
	...getTaskStatus.description,
	...deleteTask.description,
	...runLiveSearchQuery.description,
	...addIntegrators.description,
	...getIntegrators.description,
	...removeIntegrators.description,
];
