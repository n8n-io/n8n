import type { INodeProperties } from 'n8n-workflow';
import { TLP } from '../helpers/interfaces';

export const returnAllAndLimit: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
	},
];

export const responderOptions: INodeProperties = {
	displayName: 'Responder Name or ID',
	name: 'responder',
	type: 'options',
	description:
		'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
	required: true,
	default: '',
	typeOptions: {
		loadOptionsDependsOn: ['id', 'id.value'],
		loadOptionsMethod: 'loadResponders',
	},
	displayOptions: {
		hide: {
			id: [''],
		},
	},
};

export const tlpOptions: INodeProperties = {
	displayName: 'Traffict Light Protocol (TLP)',
	name: 'tlp',
	type: 'options',
	default: 2,
	options: [
		{
			name: 'White',
			value: TLP.white,
		},
		{
			name: 'Green',
			value: TLP.green,
		},
		{
			name: 'Amber',
			value: TLP.amber,
		},
		{
			name: 'Red',
			value: TLP.red,
		},
	],
};

export const severityOptions: INodeProperties = {
	displayName: 'Severity',
	name: 'severity',
	type: 'options',
	options: [
		{
			name: 'Low',
			value: 1,
		},
		{
			name: 'Medium',
			value: 2,
		},
		{
			name: 'High',
			value: 3,
		},
		{
			name: 'Critical',
			value: 4,
		},
	],
	default: 2,
	description: 'Severity of the alert. Default=Medium.',
};

export const observableTypeOptions: INodeProperties = {
	// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
	displayName: 'Data Type',
	name: 'dataType',
	type: 'options',
	default: '',
	typeOptions: {
		loadOptionsMethod: 'loadObservableTypes',
	},
	description:
		'Type of the observable. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
};

export const alertStatusOptions: INodeProperties = {
	displayName: 'Status',
	name: 'status',
	type: 'options',
	options: [
		{
			name: 'New',
			value: 'New',
		},
		{
			name: 'Updated',
			value: 'Updated',
		},
		{
			name: 'Ignored',
			value: 'Ignored',
		},
		{
			name: 'Imported',
			value: 'Imported',
		},
	],
	default: 'New',
	description: 'Status of the alert',
};

export const caseStatusOptions: INodeProperties = {
	displayName: 'Status',
	name: 'status',
	type: 'options',
	options: [
		{
			name: 'Open',
			value: 'Open',
		},
		{
			name: 'Resolved',
			value: 'Resolved',
		},
		{
			name: 'Deleted',
			value: 'Deleted',
		},
	],
	default: 'Open',
};

export const observableStatusOptions: INodeProperties = {
	displayName: 'Status',
	name: 'Status',
	type: 'options',
	default: 'Ok',
	options: [
		{
			name: 'Ok',
			value: 'Ok',
		},
		{
			name: 'Deleted',
			value: 'Deleted',
		},
	],
	description: 'Status of the observable. Default=Ok.',
};

export const taskStatusOptions: INodeProperties = {
	displayName: 'Status',
	name: 'status',
	type: 'options',
	default: 'Waiting',
	options: [
		{
			name: 'Cancel',
			value: 'Cancel',
		},
		{
			name: 'Completed',
			value: 'Completed',
		},
		{
			name: 'InProgress',
			value: 'InProgress',
		},
		{
			name: 'Waiting',
			value: 'Waiting',
		},
	],
	description: 'Status of the task. Default=Waiting.',
};
