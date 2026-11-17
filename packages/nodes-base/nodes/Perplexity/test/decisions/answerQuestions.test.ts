import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { IDataObject, WorkflowTestData } from 'n8n-workflow';
import nock from 'nock';

const baseUrl = 'https://api.perplexity.ai';

const credentials = {
	perplexityApi: {
		apiKey: 'test-api-key',
		baseUrl,
	},
};

const review = 'The headphones sound great, but the battery stopped charging after two weeks.';

const workflow = (parameters: IDataObject): WorkflowTestData['input']['workflowData'] => ({
	nodes: [
		{
			id: 'decision-node-v3',
			name: 'Decision',
			type: 'n8n-nodes-base.perplexity',
			typeVersion: 3,
			position: [0, 0],
			parameters: { resource: 'decision', operation: 'answerQuestions', ...parameters },
			credentials: { perplexityApi: { id: 'test', name: 'Perplexity account' } },
		},
	],
	connections: {},
});

describe('Perplexity Node - Decisions', () => {
	const harness = new NodeTestHarness();

	afterEach(() => {
		try {
			expect(nock.isDone()).toBe(true);
		} finally {
			nock.cleanAll();
			nock.enableNetConnect();
		}
	});

	const fixture = harness.readWorkflowJSON('answerQuestions.workflow.json');

	harness.setupTests({
		credentials,
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'post',
					path: '/v1/decisions',
					statusCode: 200,
					requestBody: {
						model: 'pplx-decider-latest',
						state: review,
						questions: {
							defect: {
								type: 'noul',
								instructions: 'Does the review report a product defect?',
							},
							sentiment: {
								type: 'choice',
								instructions: 'What is the overall sentiment of the review?',
								criteria: {
									positive: 'Mostly satisfied',
									mixed: 'Praise and complaints in one review',
									negative: 'Mostly dissatisfied',
								},
							},
							severity: {
								type: 'score',
								instructions: 'How severe is the reported problem?',
								criteria: ['Cosmetic', 'Inconvenient', 'Product unusable'],
							},
						},
					},
					responseBody: fixture.pinData?.Decision[0].json ?? {},
				},
			],
		},
	});

	const locateResponse = {
		model: 'pplx-decider-flash-v1.3',
		answers: {
			complaint: {
				type: 'locate',
				spans: [
					{ start: 36, end: 60, text: 'battery stopped charging', score: 0.9529080986976624 },
				],
			},
		},
		usage: { input_tokens: 72, output_tokens: 1 },
	};

	harness.setupTest({
		description: 'should send a versioned model unchanged with a Locate question',
		input: {
			workflowData: workflow({
				model: 'pplx-decider-flash-v1.3',
				state: review,
				questions: {
					values: [{ name: 'complaint', type: 'locate', instructions: 'the product problem' }],
				},
			}),
		},
		output: { nodeData: { Decision: [[{ json: locateResponse }]] } },
		credentials,
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'post',
					path: '/v1/decisions',
					statusCode: 200,
					requestBody: {
						model: 'pplx-decider-flash-v1.3',
						state: review,
						questions: {
							complaint: { type: 'locate', instructions: 'the product problem' },
						},
					},
					responseBody: locateResponse,
				},
			],
		},
	});

	const groundedResponse = {
		model: 'pplx-decider-latest',
		answers: {
			tier: {
				type: 'choice',
				choice: 'paid',
				confidence: 0.88,
				probabilities: { free: 0.06, paid: 0.94 },
			},
		},
		usage: { input_tokens: 1204, output_tokens: 1 },
		search_results: [
			{
				title: 'Pricing',
				url: 'https://example.com/pricing',
				snippet: 'Plans start at $10 per month.',
				date: '2026-10-01',
			},
		],
		fetched_results: [
			{
				title: 'Pricing',
				url: 'https://example.com/pricing',
				snippet: 'Plans start at $10 per month.',
			},
		],
	};

	harness.setupTest({
		description: 'should send the mode and max staleness options and omit empty instructions',
		input: {
			workflowData: workflow({
				state: 'https://example.com/pricing',
				questions: {
					values: [
						{
							name: 'tier',
							type: 'choice',
							instructions: '',
							criteria: '{"free": "No paid plan", "paid": "Has a paid plan"}',
						},
					],
				},
				options: { mode: 'web_grounding', maxStaleness: 3600 },
			}),
		},
		output: { nodeData: { Decision: [[{ json: groundedResponse }]] } },
		credentials,
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'post',
					path: '/v1/decisions',
					statusCode: 200,
					requestBody: {
						model: 'pplx-decider-latest',
						state: 'https://example.com/pricing',
						questions: {
							tier: {
								type: 'choice',
								criteria: { free: 'No paid plan', paid: 'Has a paid plan' },
							},
						},
						mode: 'web_grounding',
						max_staleness: 3600,
					},
					responseBody: groundedResponse,
				},
			],
		},
	});

	const jsonResponse = {
		model: 'pplx-decider-v1.2',
		answers: { defect: { type: 'noul', noul: 0.97 } },
		usage: { input_tokens: 41, output_tokens: 1 },
	};

	harness.setupTest({
		description: 'should send a JSON state and questions defined as JSON',
		input: {
			workflowData: workflow({
				model: 'pplx-decider-v1.2',
				stateType: 'json',
				stateJson: '{"title": "Battery died after two weeks", "rating": 2}',
				defineQuestions: 'json',
				questionsJson:
					'={{ { defect: { type: "noul", criteria: { true: "Reports a defect", false: "No defect" } } } }}',
			}),
		},
		output: { nodeData: { Decision: [[{ json: jsonResponse }]] } },
		credentials,
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'post',
					path: '/v1/decisions',
					statusCode: 200,
					requestBody: {
						model: 'pplx-decider-v1.2',
						state: { title: 'Battery died after two weeks', rating: 2 },
						questions: {
							defect: {
								type: 'noul',
								criteria: { true: 'Reports a defect', false: 'No defect' },
							},
						},
					},
					responseBody: jsonResponse,
				},
			],
		},
	});

	harness.setupTest({
		description: 'should reject duplicate question names before sending a request',
		input: {
			workflowData: workflow({
				state: review,
				questions: {
					values: [
						{ name: 'defect', type: 'noul', instructions: 'Does the review report a defect?' },
						{ name: 'defect', type: 'noul', instructions: 'Is the product broken?' },
					],
				},
			}),
		},
		output: { nodeData: {}, error: 'Question names must be unique' },
		credentials,
	});

	harness.setupTest({
		description: 'should reject criteria that are not valid JSON before sending a request',
		input: {
			workflowData: workflow({
				state: review,
				questions: {
					values: [{ name: 'sentiment', type: 'choice', instructions: '', criteria: '{positive' }],
				},
			}),
		},
		output: { nodeData: {}, error: "Input 'Criteria'  must contain a valid JSON" },
		credentials,
	});

	const defect = { name: 'defect', type: 'noul', instructions: 'Does the review report a defect?' };
	const reservedQuestionKey =
		'Question names and criteria keys cannot be __proto__, constructor or prototype';
	const reservedStateKey = 'State keys cannot be named __proto__, constructor or prototype';

	const reservedKeyCases: Array<{ rejects: string; parameters: IDataObject; error: string }> = [
		...['__proto__', 'constructor', 'prototype'].flatMap((name) => [
			{
				rejects: `a question named ${name} defined with fields`,
				parameters: { state: review, questions: { values: [defect, { ...defect, name }] } },
				error: reservedQuestionKey,
			},
			{
				rejects: `a question named ${name} defined as JSON`,
				parameters: {
					state: review,
					defineQuestions: 'json',
					questionsJson: `{"defect": {"type": "noul"}, "${name}": {"type": "noul"}}`,
				},
				error: reservedQuestionKey,
			},
		]),
		{
			rejects: 'a reserved criteria key defined with fields',
			parameters: {
				state: review,
				questions: {
					values: [
						{ name: 'kind', type: 'choice', criteria: '{"constructor": "Acme", "other": "Other"}' },
					],
				},
			},
			error: reservedQuestionKey,
		},
		{
			rejects: 'a reserved criteria key defined as JSON',
			parameters: {
				state: review,
				defineQuestions: 'json',
				questionsJson: '{"kind": {"type": "choice", "criteria": {"prototype": "An early model"}}}',
			},
			error: reservedQuestionKey,
		},
		{
			rejects: 'a reserved key in an object in a JSON state',
			parameters: {
				stateType: 'json',
				stateJson: '{"title": "Battery died", "maker": {"constructor": "Acme"}}',
				questions: { values: [defect] },
			},
			error: reservedStateKey,
		},
	];

	for (const { rejects, parameters, error } of reservedKeyCases) {
		harness.setupTest({
			description: `should reject ${rejects} before sending a request`,
			input: { workflowData: workflow(parameters) },
			output: { nodeData: {}, error },
			credentials,
		});
	}

	const reservedKeysInArray =
		'[{"constructor": "Acme", "prototype": "early", "__proto__": "ordinary text"}, "Other"]';
	const arrayResponse = {
		model: 'pplx-decider-latest',
		answers: { severity: { type: 'score', score: 0.4 } },
	};

	harness.setupTest({
		description: 'should send reserved keys inside arrays in a JSON state and Score criteria',
		input: {
			workflowData: workflow({
				stateType: 'json',
				stateJson: `{"details": ${reservedKeysInArray}}`,
				questions: { values: [{ name: 'severity', type: 'score', criteria: reservedKeysInArray }] },
			}),
		},
		output: { nodeData: { Decision: [[{ json: arrayResponse }]] } },
		credentials,
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'post',
					path: '/v1/decisions',
					statusCode: 200,
					requestBody: {
						model: 'pplx-decider-latest',
						state: { details: JSON.parse(reservedKeysInArray) },
						questions: { severity: { type: 'score', criteria: JSON.parse(reservedKeysInArray) } },
					},
					responseBody: arrayResponse,
				},
			],
		},
	});

	harness.setupTest({
		description: 'should surface the message of an API 400 response',
		input: {
			workflowData: workflow({
				model: 'pplx-decider-v1.2',
				state: review,
				questions: {
					values: [{ name: 'complaint', type: 'locate', instructions: 'the product problem' }],
				},
			}),
		},
		output: { nodeData: {}, error: 'Locate is not enabled for this model' },
		credentials,
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'post',
					path: '/v1/decisions',
					statusCode: 400,
					requestBody: {
						model: 'pplx-decider-v1.2',
						state: review,
						questions: {
							complaint: { type: 'locate', instructions: 'the product problem' },
						},
					},
					responseBody: {
						error: {
							message: 'Locate is not enabled for this model',
							type: 'invalid_request_error',
							code: 400,
						},
					},
				},
			],
		},
	});
});
