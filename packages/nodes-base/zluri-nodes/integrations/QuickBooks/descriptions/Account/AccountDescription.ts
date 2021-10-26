import {
	INodeProperties,
} from 'n8n-workflow';

// import {
// 	accountAdditionalFieldsOptions,
// } from './AccountAdditionalFieldsOptions';

export const accountOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'get',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'account',
				],
			},
		},
	},
] as INodeProperties[];

export const accountFields = [
	// ----------------------------------
	//         Account: create
	// ----------------------------------
	{
		displayName: 'Account Name',
		name: 'accountName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Account Type',
		name: 'accountType',
		type: 'string',
		default: 'Accounts Receivable',
		displayOptions: {
			show: {
				resource: [
					'account',
				],
				operation: [
					'create',
				],
			},
		},
    options:[{
		displayName: 'Accounts Receivable',
		name: 'accountReceivable',
		description: '',
		type: 'boolean',
		default: true,
	}]
	},

	// ----------------------------------
	//         Account : delete
	// ----------------------------------
	{
		displayName: 'Employee ID',
		name: 'employeeId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the employee to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'employee',
				],
				operation: [
					'get',
				],
			},
		},
	},

] as INodeProperties[];
