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
					'code',
				],
			},
		},
		options: [
			{
				name: 'Advanced Switch',
				value: 'advancedSwitch',
				description: 'Run Python via API',
			},
			{
				name: 'BMI Calculator',
				value: 'bmiCalculator',
				description: 'Run Python via API',
			},
			{
				name: 'Calendar Week',
				value: 'calendarWeek',
				description: 'Run Python via API',
			},
			{
				name: 'Detect Gender Name',
				value: 'detectGenderName',
				description: 'Run Python via API',
			},
			{
				name: 'Email Verifier',
				value: 'emailVerifier',
				description: 'Run Python via API',
			},
			{
				name: 'Expand URL',
				value: 'expandUrl',
				description: 'Run Python via API',
			},
			{
				name: 'Global Variable',
				value: 'globalVariable',
				description: 'Run Python via API',
			},
			{
				name: 'Holiday Checker',
				value: 'holidayChecker',
				description: 'Run Python via API',
			},
			{
				name: 'IP to Geolocation',
				value: 'ipToGeoLocation',
				description: 'Run Python via API',
			},
			{
				name: 'JSON Bin',
				value: 'jsonBin',
				description: 'Run Python via API',
			},
			{
				name: 'Nation to ISO',
				value: 'nationToIso',
				description: 'Run Python via API',
			},
			{
				name: 'QR Code',
				value: 'qrCode',
				description: 'Run Python via API',
			},
			{
				name: 'Replacer',
				value: 'replacer',
				description: 'Run Python via API',
			},
			{
				name: 'Timezone Switch',
				value: 'timezoneSwitch',
				description: 'Run Python via API',
			},
			{
				name: 'URL Shortener',
				value: 'urlShortener',
				description: 'Run Python via API',
			},
			{
				name: 'UTM Parameters',
				value: 'utmParameters',
				description: 'Run Python via API',
			},
			{
				name: 'VAT ID Checker',
				value: 'varIdChecker',
				description: 'Run Python via API',
			},
			{
				name: 'Weekend Checker',
				value: 'weekendChecker',
				description: 'Run Javascript via API',
			},
		],
		default: 'advancedSwitch',
	},
] as INodeProperties[];

export const noCodeHelperFields = [] as INodeProperties[];
