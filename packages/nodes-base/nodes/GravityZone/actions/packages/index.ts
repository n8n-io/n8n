import type { INodeProperties } from 'n8n-workflow';

import * as createPackage from './createPackage.operation';
import * as deletePackage from './deletePackage.operation';
import * as getInstallationLinks from './getInstallationLinks.operation';
import * as getPackageDetails from './getPackageDetails.operation';
import * as getPackagesList from './getPackagesList.operation';
import * as updatePackage from './updatePackage.operation';

export {
	getInstallationLinks,
	createPackage,
	getPackagesList,
	deletePackage,
	getPackageDetails,
	updatePackage,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { category: ['packages'] } },
		options: [
			{
				name: 'Create Package',
				value: 'createPackage',
				action: 'Create a new package',
			},
			{
				name: 'Delete Package',
				value: 'deletePackage',
				action: 'Delete a package',
			},
			{
				name: 'Get Installation Links',
				value: 'getInstallationLinks',
				action: 'Get installation links for a package',
			},
			{
				name: 'Get Package Details',
				value: 'getPackageDetails',
				action: 'Get details of a specific package',
			},
			{
				name: 'Get Packages List',
				value: 'getPackagesList',
				action: 'Get list of packages',
			},
			{
				name: 'Update Package',
				value: 'updatePackage',
				action: 'Update an installation package',
			},
		],
		default: 'getPackagesList',
	},
	...getInstallationLinks.description,
	...createPackage.description,
	...getPackagesList.description,
	...deletePackage.description,
	...getPackageDetails.description,
	...updatePackage.description,
];
