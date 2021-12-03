import {
	INodeProperties,
} from 'n8n-workflow';

export const queryOptions = [
	{
		displayName: 'Start',
		name: 'start',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'query',
				],
			},
		},
		default: 0,
		description:'Offset from the result set',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		required: false,
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'query',
				],
			},
		},
		default: 1000,
		description:'Max records to return (up to 30000)',
	},
	{
		displayName: 'Query Options',
		name: 'queryOptions',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'query',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'json',
				default:'',
				description:'Query for matching submissions, in MongoDB JSON format (e.g. {"_submission_time":{"$lt":"2021-10-01T01:02:03"}})',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description:'Comma-separated list of fields to retrieve (e.g. _submission_time,_submitted_by)',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'json',
				default: '',
				description:'Sort predicates, in Mongo JSON format (e.g. {"_submission_time":1})',
			},
		],
	}] as INodeProperties[];
