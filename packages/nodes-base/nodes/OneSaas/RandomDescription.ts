import {
	INodeProperties,
 } from 'n8n-workflow';

export const randomOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'random',
				],
			},
		},
		options: [
			{
				name: 'City',
				value: 'city',
				description: 'Get a random City',
			},
			{
				name: 'Name',
				value: 'name',
				description: 'Get random Name',
			},
			{
				name: 'Number',
				value: 'number',
				description: 'Generate a random Number',
			},
			{
				name: 'String',
				value: 'string',
				description: 'Generate a random String',
			},
		],
		default: 'city',
	},
] as INodeProperties[];

export const randomFields = [
	// random: randomNumber
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'number',
				],
				resource: [
					'random',
				],
			},
		},
		default: '1,42',
		description: 'Define the range in which between the random number should be Comma seperated',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'number',
				],
				resource: [
					'random',
				],
			},
		},
		options: [
			{
				name: 'Integer',
				value: 'integer',
			},
			{
				name: 'Decimal',
				value: 'decimal',
			},
		],
		default: 'integer',
		description: 'Integer, Decimal (if decimal we will always return 2 nr behind the dot)',
	},
	// random: randomString
	{
		displayName: 'Length',
		name: 'leng',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'string',
				],
				resource: [
					'random',
				],
			},
		},
		default: '',
		description: 'Define how many chars your string should have',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'string',
				],
				resource: [
					'random',
				],
			},
		},
		options: [
			{
				name: 'Numbers',
				value: '1',
			},
			{
				name: 'Numbers + Lowercase Letters',
				value: '2',
			},
			{
				name: 'numbers + Lower / Uppercase Letters',
				value: '3',
			},
			{
				name: 'numbers + Lower / Uppercase Letters + specialchars',
				value: '4',
			},
		],
		default: '4',
		description: 'Characters to include in your string',
	},
] as INodeProperties[];
