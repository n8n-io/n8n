import type { INodeProperties } from 'n8n-workflow';

import * as addProductKey from './addProductKey.operation';
import * as getLicenseInfo from './getLicenseInfo.operation';
import * as getMonthlyUsage from './getMonthlyUsage.operation';
import * as getMonthlyUsagePerProductType from './getMonthlyUsagePerProductType.operation';
import * as removeProductKey from './removeProductKey.operation';
import * as setLicenseKey from './setLicenseKey.operation';

export {
	getLicenseInfo,
	setLicenseKey,
	addProductKey,
	removeProductKey,
	getMonthlyUsage,
	getMonthlyUsagePerProductType,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { category: ['licensing'] } },
		options: [
			{
				name: 'Add Product Key',
				value: 'addProductKey',
				action: 'Add a product key to a company',
			},
			{
				name: 'Get License Info',
				value: 'getLicenseInfo',
				action: 'Get license information',
			},
			{
				name: 'Get Monthly Usage',
				value: 'getMonthlyUsage',
				action: 'Get monthly license usage',
			},
			{
				name: 'Get Monthly Usage Per Product Type',
				value: 'getMonthlyUsagePerProductType',
				action: 'Get monthly license usage per product type',
			},
			{
				name: 'Remove Product Key',
				value: 'removeProductKey',
				action: 'Remove a license key from a company',
			},
			{
				name: 'Set License Key',
				value: 'setLicenseKey',
				action: 'Set license key for a company',
			},
		],
		default: 'getLicenseInfo',
	},
	...getLicenseInfo.description,
	...setLicenseKey.description,
	...addProductKey.description,
	...removeProductKey.description,
	...getMonthlyUsage.description,
	...getMonthlyUsagePerProductType.description,
];
