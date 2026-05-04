import type { INodeProperties } from 'n8n-workflow';

import * as configureNotificationsSettings from './configureNotificationsSettings.operation';
import * as createAccount from './createAccount.operation';
import * as deleteAccount from './deleteAccount.operation';
import * as getAccountDetails from './getAccountDetails.operation';
import * as getAccountsList from './getAccountsList.operation';
import * as getNotificationsSettings from './getNotificationsSettings.operation';
import * as updateAccount from './updateAccount.operation';

export {
	configureNotificationsSettings,
	createAccount,
	deleteAccount,
	getAccountDetails,
	getAccountsList,
	getNotificationsSettings,
	updateAccount,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		required: true,
		default: 'getAccountsList',
		displayOptions: {
			show: { category: ['accounts'] },
		},
		options: [
			{
				name: 'Configure Notifications Settings',
				value: 'configureNotificationsSettings',
				action: 'Configure notification settings for an account',
			},
			{
				name: 'Create',
				value: 'createAccount',
				action: 'Create a new account',
			},
			{
				name: 'Delete',
				value: 'deleteAccount',
				action: 'Delete an account',
			},
			{
				name: 'Get Details',
				value: 'getAccountDetails',
				action: 'Get details of an account',
			},
			{
				name: 'Get List',
				value: 'getAccountsList',
				action: 'Get a list of accounts',
			},
			{
				name: 'Get Notifications Settings',
				value: 'getNotificationsSettings',
				action: 'Get notification settings for an account',
			},
			{
				name: 'Update',
				value: 'updateAccount',
				action: 'Update an account',
			},
		],
	},
	...configureNotificationsSettings.description,
	...createAccount.description,
	...deleteAccount.description,
	...getAccountDetails.description,
	...getAccountsList.description,
	...getNotificationsSettings.description,
	...updateAccount.description,
];
