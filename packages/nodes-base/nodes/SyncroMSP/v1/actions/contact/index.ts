
import * as getAll from './getAll';
import * as addContact from './addContact';
import * as getContact from './getContact';
import * as updateContact from './updateContact';
import * as deleteContact from './deleteContact';

import { INodeProperties } from 'n8n-workflow';

export {
	getAll,
	addContact,
	deleteContact,
	updateContact,
	getContact,
};


export const descriptions = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all contacts',
			},
			{
				name: 'Get',
				value: 'getContact',
				description: 'Retrieve contact',
			},
			{
				name: 'Create',
				value: 'addContact',
				description: 'add new contact',
			},
			{
				name: 'Delete',
				value: 'deleteContact',
				description: 'delete contact',
			},
			{
				name: 'Update',
				value: 'updateContact',
				description: 'update contact',
			},
		],
		default: '',
		description: 'The operation to perform.',
	},
	...getAll.description,
	...addContact.description,
	...getContact.description,
	...updateContact.description,
	...deleteContact.description,
] as INodeProperties[];

