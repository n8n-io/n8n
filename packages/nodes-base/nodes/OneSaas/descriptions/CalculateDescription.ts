import { INodeProperties } from 'n8n-workflow';
import { languages } from '../ressources/languages';

export const calculateOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['calculate'],
			},
		},
		options: [
			{
				name: 'BMI',
				value: 'bmi',
				description:
					'Calculates the Body Mass Index and outputs recommended nutrients distribution.',
			},
			{
				name: 'Geodistance',
				value: 'geodistance',
				description: 'Calculates the geodistance between two addresses or geopoints.',
			},
		],
		default: 'bmi',
	},
] as INodeProperties[];

export const calculateFields = [
	// calculate: bmi
	{
		displayName: 'Height in cm',
		name: 'height',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				operation: ['bmi'],
				resource: ['calculate'],
			},
		},
		default: '',
	},
	{
		displayName: 'Weight in kg',
		name: 'weight',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				operation: ['bmi'],
				resource: ['calculate'],
			},
		},
		default: '',
	},
	// calculate: geodistance
	{
		displayName: 'Starting location',
		name: 'startPoint',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['geodistance'],
				resource: ['calculate'],
			},
		},
		default: 'Berlin',
	},
	{
		displayName: 'Ending location',
		name: 'endPoint',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['geodistance'],
				resource: ['calculate'],
			},
		},
		default: 'Flensburg',
	},
] as INodeProperties[];
