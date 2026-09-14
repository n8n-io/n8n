import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import * as create from './create.operation';
import * as createOrGet from './createOrGet.operation';
import * as deleteMeeting from './deleteMeeting.operation';
import * as get from './get.operation';
import * as update from './update.operation';
import { userRLC } from '../../descriptions';
import { SERVICE_PRINCIPAL_AUTH, SP_HIDE } from '../../transport';

export { create, createOrGet, deleteMeeting, get, update };

const organizerRLC: INodeProperties = {
	...userRLC,
	displayName: 'Organizer',
	name: 'organizerId',
	description:
		'The user whose meetings the app creates and manages. From List and user principal names need the User.Read.All application permission; an object ID needs none.',
	displayOptions: {
		show: {
			resource: ['onlineMeeting'],
			'/authentication': [SERVICE_PRINCIPAL_AUTH],
		},
	},
};

const operations: INodePropertyOptions[] = [
	{
		name: 'Create',
		value: 'create',
		description: 'Create an online meeting',
		action: 'Create online meeting',
	},
	{
		name: 'Create or Get',
		value: 'createOrGet',
		description:
			'Create an online meeting with your own external ID, or get the existing meeting with that ID',
		action: 'Create or get online meeting',
	},
	{
		name: 'Delete',
		value: 'deleteMeeting',
		description: 'Delete an online meeting',
		action: 'Delete online meeting',
	},
	{
		name: 'Get',
		value: 'get',
		description: 'Get an online meeting by ID or join URL',
		action: 'Get online meeting',
	},
	{
		name: 'Update',
		value: 'update',
		description: 'Update an online meeting',
		action: 'Update online meeting',
	},
];

// Un-gated for the Service Principal credential so far; the rest stay delegated-only.
const servicePrincipalOperations = ['create', 'get'];

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['onlineMeeting'],
			},
			hide: {
				...SP_HIDE,
			},
		},
		options: operations,
		default: 'create',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['onlineMeeting'],
				'/authentication': [SERVICE_PRINCIPAL_AUTH],
			},
		},
		options: operations.filter(
			(option) =>
				typeof option.value === 'string' && servicePrincipalOperations.includes(option.value),
		),
		default: 'create',
	},
	{
		displayName:
			'With the Service Principal credential, online meetings need the OnlineMeetings.ReadWrite.All application permission (Read.All is enough for Get) and a Teams application access policy that grants this app access to the organizer\'s meetings. <a href="https://docs.n8n.io/integrations/builtin/credentials/microsoftentraserviceprincipal/#allow-app-only-online-meetings" target="_blank">Learn more</a>.',
		name: 'onlineMeetingServicePrincipalNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['onlineMeeting'],
				authentication: [SERVICE_PRINCIPAL_AUTH],
			},
		},
	},
	organizerRLC,

	...create.description,
	...createOrGet.description,
	...deleteMeeting.description,
	...get.description,
	...update.description,
];
