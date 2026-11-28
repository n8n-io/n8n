import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'decisionModel',
		type: 'resourceLocator',
		required: true,
		default: { mode: 'list', value: 'pplx-decider-latest' },
		description:
			'The decision model to use. Each alias in the list follows the newest version of its model, and pplx-decider-flash-latest is the smaller of the two. To pin a version, select By ID and enter its name.',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getDecisionModels',
					skipCredentialsCheckInRLC: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. pplx-decider-v1.3',
			},
		],
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
									'Finds the parts of the state that match the instructions. Needs a text state. Models before v1.3 do not answer Locate questions.',
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
			'A JSON object that maps each question name to a question. Each question has a type and, depending on the type, instructions and criteria.',
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
					'How the API gathers evidence beyond the state. Each completed web search or successful URL fetch is billed.',
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
