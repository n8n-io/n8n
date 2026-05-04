import type { INodeProperties } from 'n8n-workflow';

import * as assignMaintenanceWindows from './assignMaintenanceWindows.operation';
import * as createPatchManagementMaintenanceWindow from './createPatchManagementMaintenanceWindow.operation';
import * as deleteMaintenanceWindow from './deleteMaintenanceWindow.operation';
import * as getMaintenanceWindowDetails from './getMaintenanceWindowDetails.operation';
import * as getMaintenanceWindowsList from './getMaintenanceWindowsList.operation';
import * as getManuallyApprovedPatches from './getManuallyApprovedPatches.operation';
import * as unassignMaintenanceWindows from './unassignMaintenanceWindows.operation';
import * as updatePatchManagementMaintenanceWindow from './updatePatchManagementMaintenanceWindow.operation';

export {
	createPatchManagementMaintenanceWindow,
	getMaintenanceWindowsList,
	getMaintenanceWindowDetails,
	updatePatchManagementMaintenanceWindow,
	deleteMaintenanceWindow,
	assignMaintenanceWindows,
	unassignMaintenanceWindows,
	getManuallyApprovedPatches,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				category: ['maintenance_windows'],
			},
		},
		options: [
			{
				name: 'Assign Maintenance Windows',
				value: 'assignMaintenanceWindows',
				action: 'Apply a maintenance window to a policy',
			},
			{
				name: 'Create Patch Management Maintenance Window',
				value: 'createPatchManagementMaintenanceWindow',
				action: 'Create a patch management maintenance window',
			},
			{
				name: 'Delete Maintenance Window',
				value: 'deleteMaintenanceWindow',
				action: 'Delete a maintenance window',
			},
			{
				name: 'Get Maintenance Window Details',
				value: 'getMaintenanceWindowDetails',
				action: 'Get details of a maintenance window',
			},
			{
				name: 'Get Maintenance Windows List',
				value: 'getMaintenanceWindowsList',
				action: 'Get a list of maintenance windows',
			},
			{
				name: 'Get Manually Approved Patches',
				value: 'getManuallyApprovedPatches',
				action: 'Get a list of manually approved patches for a company',
			},
			{
				name: 'Unassign Maintenance Windows',
				value: 'unassignMaintenanceWindows',
				action: 'Remove a maintenance window from a policy',
			},
			{
				name: 'Update Patch Management Maintenance Window',
				value: 'updatePatchManagementMaintenanceWindow',
				action: 'Update a maintenance window settings',
			},
		],
		default: 'getMaintenanceWindowsList',
	},
	...createPatchManagementMaintenanceWindow.description,
	...getMaintenanceWindowsList.description,
	...getMaintenanceWindowDetails.description,
	...updatePatchManagementMaintenanceWindow.description,
	...deleteMaintenanceWindow.description,
	...assignMaintenanceWindows.description,
	...unassignMaintenanceWindows.description,
	...getManuallyApprovedPatches.description,
];
