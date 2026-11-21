import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'PPLX Decider Latest',
				value: 'pplx-decider-latest',
				description:
					'Alias for the newest 27B decision model. It can move to a newer model over time.',
			},
			{
				name: 'PPLX Decider Flash Latest',
				value: 'pplx-decider-flash-latest',
				description:
					'Alias for the newest 4B decision model. It can move to a newer model over time.',
			},
			{
				name: 'PPLX Decider V1.3',
				value: 'pplx-decider-v1.3',
				description: '27B decision model, version 1.3',
			},
			{
				name: 'PPLX Decider Flash V1.3',
				value: 'pplx-decider-flash-v1.3',
				description: '4B decision model, version 1.3',
			},
			{
				name: 'PPLX Decider V1.2',
				value: 'pplx-decider-v1.2',
				description: '27B decision model, version 1.2. Does not answer Locate questions.',
			},
			{
				name: 'PPLX Decider Flash V1.2',
				value: 'pplx-decider-flash-v1.2',
				description: '4B decision model, version 1.2. Does not answer Locate questions.',
			},
		],
		default: 'pplx-decider-latest',
		description:
			'The decision model to use. A versioned model does not change when an alias moves. A retired version routes to the version that replaces it.',
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
	},
	{
		displayName: 'State Type',
		name: 'stateType',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Text', value: 'text' },
			{ name: 'JSON', value: 'json' },
		],
		default: 'text',
		description: 'The format of the content the questions refer to',
	},
	{
		displayName: 'State',
		name: 'state',
		type: 'string',
		required: true,
		default: '',
		typeOptions: { rows: 3 },
		description: 'The content the questions refer to',
		displayOptions: {
			show: {
				stateType: ['text'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'state',
			},
		},
	},
	{
		displayName: 'State (JSON)',
		name: 'stateJson',
		type: 'json',
		required: true,
		default: '',
		placeholder: 'e.g. {"title": "Battery died after two weeks", "review": "It stopped charging."}',
		description: 'The content the questions refer to, as a JSON object or array',
		displayOptions: {
			show: {
				stateType: ['json'],
			},
		},
	},
	{
		displayName: 'Define Questions',
		name: 'defineQuestions',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Using Fields Below', value: 'fields' },
			{ name: 'Using JSON', value: 'json' },
		],
		default: 'fields',
	},
	{
		displayName: 'Questions',
		name: 'questions',
		type: 'fixedCollection',
		required: true,
		typeOptions: {
			multipleValues: true,
			sortable: true,
		},
		placeholder: 'Add Question',
		default: {},
		description:
			'The questions to answer about the state. The response has one answer per question.',
		displayOptions: {
			show: {
				defineQuestions: ['fields'],
			},
		},
		options: [
			{
				displayName: 'Question',
				name: 'values',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						required: true,
						default: '',
						placeholder: 'e.g. sentiment',
						description: 'The key of the answer in the response. Each name must be unique.',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Yes or No',
								value: 'noul',
								description: 'Returns the probability of yes, from 0 to 1, in the noul field',
							},
							{
								name: 'Choice',
								value: 'choice',
								description: 'Picks one of the options you define',
							},
							{
								name: 'Score',
								value: 'score',
								description: 'Rates the content on an ordered rubric',
							},
							{
								name: 'Locate',
								value: 'locate',
								description:
									'Finds the parts of the state that match the instructions. Needs a text state. The v1.2 models do not answer Locate questions.',
							},
						],
						default: 'noul',
					},
					{
						displayName: 'Instructions',
						name: 'instructions',
						type: 'string',
						required: true,
						default: '',
						typeOptions: { rows: 2 },
						placeholder: 'e.g. Does the review report a product defect?',
						description: 'What to decide or find',
						displayOptions: { show: { type: ['noul', 'locate'] } },
					},
					{
						displayName: 'Instructions',
						name: 'instructions',
						type: 'string',
						default: '',
						typeOptions: { rows: 2 },
						placeholder: 'e.g. What is the overall sentiment of the review?',
						description: 'What to pick or rate',
						displayOptions: { show: { type: ['choice', 'score'] } },
					},
					{
						displayName: 'Criteria',
						name: 'criteria',
						type: 'json',
						required: true,
						default: '',
						placeholder: 'e.g. {"positive": "Mostly satisfied", "negative": "Mostly dissatisfied"}',
						description:
							'For Choice, a JSON object that maps each option name to a description of when it applies. For Score, a JSON array of level descriptions, ordered from the lowest level to the highest.',
						displayOptions: { show: { type: ['choice', 'score'] } },
					},
				],
			},
		],
	},
	{
		displayName: 'Questions (JSON)',
		name: 'questionsJson',
		type: 'json',
		required: true,
		default: '',
		placeholder:
			'e.g. {"defect": {"type": "noul", "instructions": "Does the review report a defect?"}}',
		description:
			'A JSON object that maps each question name to a question with a type, instructions, and criteria',
		displayOptions: {
			show: {
				defineQuestions: ['json'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Max Staleness',
				name: 'maxStaleness',
				type: 'number',
				default: 86400,
				typeOptions: {
					minValue: 0,
					numberPrecision: 0,
				},
				description:
					'Maximum age, in seconds since its last crawl, of the page fetched when the state is a single URL. An older copy is crawled again. Used only when Mode is Web Grounding. Without this option, a stored copy of any age is used.',
				routing: {
					send: {
						type: 'body',
						property: 'max_staleness',
					},
				},
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Web Grounding',
						value: 'web_grounding',
						description:
							'Searches the web for evidence before the model answers, and fetches the page when the state is a single URL',
					},
				],
				default: 'web_grounding',
				description:
					'How the API gathers evidence beyond the state. Each web search or successful URL fetch is billed.',
				routing: {
					send: {
						type: 'body',
						property: 'mode',
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['decision'],
		operation: ['answerQuestions'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
