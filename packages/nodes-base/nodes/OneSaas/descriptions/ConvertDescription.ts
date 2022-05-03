import { INodeProperties } from 'n8n-workflow';
import { currencies } from '../ressources/currencies';
import { languages } from '../ressources/languages';

export const convertOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['convert'],
			},
		},
		options: [
			{
				name: 'IP to Geo',
				value: 'iptogeo',
				description: 'Gets the geolocation of an IP address.',
			},
			{
				name: 'Nation ISO switch',
				value: 'nationiso',
				description: 'Get the Nation by Country Code ISO or reverse.',
			},
			{
				name: 'Convert Currency',
				value: 'currency',
				description: 'Converts a currency into another on specific dates.',
			},
			{
				name: 'Convert a CSV to JSON',
				value: 'csvtojson',
				description: 'Takes a CSV string and converts it to a valid JSON.',
			},
		],
		default: 'iptogeo',
	},
] as INodeProperties[];

export const convertFields = [
	// convert: iptogeo
	{
		displayName: 'IPV4 or IPV6',
		name: 'ip',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['iptogeo'],
				resource: ['convert'],
			},
		},
		default: '',
		description: 'Text you want to analyse',
	},
	// convert: nationiso
	{
		displayName: 'Operation',
		name: 'nationisoop',
		type: 'options',
		options: [
			{
				name: 'Nation to ISO',
				value: 'nation',
			},
			{
				name: 'ISO to Nation',
				value: 'iso',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: ['nationiso'],
				resource: ['convert'],
			},
		},
		default: 'nation',
	},
	{
		displayName: 'Nation Value',
		name: 'nation',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['nationiso'],
				resource: ['convert'],
				nationisoop: ['nation'],
			},
		},
		default: '',
		description: 'Use the full name of the Nation in English language.',
	},
	{
		displayName: 'ISO Value',
		name: 'iso',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['nationiso'],
				resource: ['convert'],
				nationisoop: ['iso'],
			},
		},
		default: '',
		description: 'Use the ISO-Alpha-3166 of the Nation (i.e. DE).',
	},
	// convert: currency
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		required: true,
		typeOptions: {
			minValue: 0.01,
			numberPrecision: 2,
		},
		displayOptions: {
			show: {
				operation: ['currency'],
				resource: ['convert'],
			},
		},
		default: 10.0,
	},
	{
		displayName: 'Source currency',
		name: 'sourceCurrency',
		type: 'options',
		options: currencies,
		required: true,
		displayOptions: {
			show: {
				operation: ['currency'],
				resource: ['convert'],
			},
		},
		default: '',
	},
	{
		displayName: 'Target currency',
		name: 'targetCurrency',
		type: 'options',
		options: currencies,
		required: true,
		displayOptions: {
			show: {
				operation: ['currency'],
				resource: ['convert'],
			},
		},
		default: '',
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'dateTime',
		displayOptions: {
			show: {
				operation: ['currency'],
				resource: ['convert'],
			},
		},
		default: '',
		description: 'Convert currency to how it used to be in the past.',
	},
	// convert: csvtojson
	{
		displayName: 'CSV',
		name: 'csv',
		type: 'string',
		required: true,
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				operation: ['csvtojson'],
				resource: ['convert'],
			},
		},
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				operation: ['csvtojson'],
				resource: ['convert'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Delimiter',
				name: 'delimiter',
				type: 'string',
				default: 'auto',
				description:
					'Delimiter used for seperating columns. Leave empty if delimiter is unknown in advance, in this case, delimiter will be auto-detected (by best attempt).',
			},
			{
				displayName: 'Trim CSV',
				name: 'trim',
				type: 'boolean',
				default: true,
				description:
					'Indicate if parser trim off spaces surrounding column content. e.g. " content " will be trimmed to "content".',
			},
			{
				displayName: 'CSV headers',
				name: 'noheader',
				type: 'boolean',
				default: false,
				description: 'Indicating csv data has no header row and first row is data row.',
			},
			{
				displayName: 'Ignore empty values',
				name: 'ignoreEmpty',
				type: 'boolean',
				default: true,
				description:
					'Ignore the empty value in CSV columns. If a column value is not given, set this to true to skip them.',
			},
		],
	},
] as INodeProperties[];
