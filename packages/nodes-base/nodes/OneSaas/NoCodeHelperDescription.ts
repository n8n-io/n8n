import {
	INodeProperties,
 } from 'n8n-workflow';

export const noCodeHelperOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'noCodeHelper',
				],
			},
		},
		options: [
			{
				name: 'Advanced Switch',
				value: 'advancedSwitch',
				description: 'Advanced switching key and values',
			},
			{
				name: 'BMI Calculator',
				value: 'bmiCalculator',
				description: 'BMI calculator',
			},
			{
				name: 'Calendar Week',
				value: 'calendarWeek',
				description: 'Get inforamtion about a week',
			},
			{
				name: 'Detect Gender Name',
				value: 'detectGenderName',
				description: 'Return the assumed gender for a firstname',
			},
			{
				name: 'Email Verifier',
				value: 'emailVerifier',
				description: 'Verify and check an email address',
			},
			{
				name: 'Expand URL',
				value: 'expandUrl',
				description: 'Expand a shortend URL',
			},
			{
				name: 'Global Variable',
				value: 'globalVariable',
				description: 'Manage global variables',
			},
			{
				name: 'Holiday Checker',
				value: 'holidayChecker',
				description: 'Get a list of public holidays',
			},
			{
				name: 'IP to Geolocation',
				value: 'ipToGeoLocation',
				description: 'Find the location for an IP address',
			},
			{
				name: 'JSON Bin',
				value: 'jsonBin',
				description: 'Store and manage JSON data',
			},
			{
				name: 'Nation to ISO',
				value: 'nationToIso',
				description: 'Convert a country to and from an ISO code',
			},
			{
				name: 'QR Code',
				value: 'qrCode',
				description: 'Generate a QR code or read a QR code from a URL',
			},
			{
				name: 'Replacer',
				value: 'replacer',
				description: 'Replace values in an object',
			},
			{
				name: 'Timezone Switch',
				value: 'timezoneSwitch',
				description: 'Switch the time between regions',
			},
			{
				name: 'URL Shortener',
				value: 'urlShortener',
				description: 'Manage a short URL',
			},
			{
				name: 'UTM Parameters',
				value: 'utmParameters',
				description: 'Extract UTM parameters from a URL',
			},
			{
				name: 'VAT ID Checker',
				value: 'vatIdChecker',
				description: 'Check if a VAT ID is valid',
			},
			{
				name: 'Weekend Checker',
				value: 'weekendChecker',
				description: 'Find out if a date is a weekend',
			},
		],
		default: 'advancedSwitch',
	},
] as INodeProperties[];

export const noCodeHelperFields = [
	// noCodeHelper: advancedSwitch
	{
		displayName: 'Code',
		name: 'code',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'advancedSwitch',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'Your javascript code',
	},
	// noCodeHelper: bmiCalculator
	{
		displayName: 'Height',
		name: 'height',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'bmiCalculator',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'The height in CM',
	},
	{
		displayName: 'Weight',
		name: 'weight',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'bmiCalculator',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'The weight in KG',
	},
	// noCodeHelper: calendarWeek
	// TODO: Add options
	// noCodeHelper: detectGenderName
	{
		displayName: 'Firstname',
		name: 'firstname',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'detectGenderName',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'The firstnames gender you want to verify',
	},
	// noCodeHelper: emailVerifier
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'emailVerifier',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'Email to verify and check',
	},
	// noCodeHelper: expandUrl
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'expandUrl',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'The short URL you want to get the full URL for',
	},
	// noCodeHelper: globalVariable
	{
		displayName: 'Variable',
		name: 'variable',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'globalVariable',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'Name of the stored variable',
	}, // Add options for Update, Delete, Value
	// noCodeHelper: holidayChecker
	{
		displayName: 'Year',
		name: 'year',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'holidayChecker',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'Year to check',
	},
	{
		displayName: 'Country',
		name: 'countryCode',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'holidayChecker',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'ISO 3166-2 country code. For example "DE"',
	}, // Add optional State (ISO 3166-2)
	// noCodeHelper: ipToGeoLocation
	{
		displayName: 'IP',
		name: 'ip',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'ipToGeoLocation',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'The IP address you want to verfiy',
	},
	// noCodeHelper: jsonBin
	{
		displayName: 'JSON',
		name: 'json',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'jsonBin',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'The JSON data to store',
	}, // Add options
	// noCodeHelper: nationToIso
	{
		displayName: 'Country',
		name: 'country',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'nationToIso',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'Country name or ISO code',
	}, // Add option for isISO
	// noCodeHelper: qrCode
	{
		displayName: 'Data',
		name: 'data',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'qrCode',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'Data to hide or URL to code to read',
	}, // Add option for isRead
	// noCodeHelper: replacer
	// Need to think
	// noCodeHelper: timezoneSwitch
	{
		displayName: 'Time',
		name: 'inputTime',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'timezoneSwitch',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'Datetime to convert',
	},
	{
		displayName: 'Input Timezone',
		name: 'inputTimeZone',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'timezoneSwitch',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'Timezone to convert from',
	},
	{
		displayName: 'Destination Timezone',
		name: 'destinationTimeZone',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'timezoneSwitch',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'Timezone to convert to',
	},
	// noCodeHelper: urlShortener
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'urlShortener',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'URL to shorten',
	}, // Add option to update
	// noCodeHelper: utmParameters
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'utmParameters',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'URL to analyze',
	},
	// noCodeHelper: vatIdChecker
	{
		displayName: 'VAT ID',
		name: 'vatId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'vatIdChecker',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'VAT ID to check',
	},
	// noCodeHelper: weekendChecker
	{
		displayName: 'Date',
		name: 'date',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'weekendChecker',
				],
				resource: [
					'noCodeHelper',
				],
			},
		},
		default: '',
		description: 'Date to check (Default: MM/DD/YYYY)',
	}, // Add format option
] as INodeProperties[];
