import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { deepCopy, jsonParse, NodeOperationError } from 'n8n-workflow';

import { idsExist, surveyMonkeyApiRequest, surveyMonkeyRequestAllItems } from './GenericFunctions';

import type { IAnswer, IChoice, IOther, IQuestion, IRow } from './Interfaces';

import { createHmac } from 'crypto';

export class SurveyMonkeyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SurveyMonkey Trigger',
		name: 'surveyMonkeyTrigger',
		icon: 'file:surveyMonkey.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Survey Monkey events occur',
		defaults: {
			name: 'SurveyMonkey Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'surveyMonkeyApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'surveyMonkeyOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'HEAD',
				responseMode: 'onReceived',
				path: 'webhook',
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
			},
			{
				displayName: 'Type',
				name: 'objectType',
				type: 'options',
				options: [
					{
						name: 'Collector',
						value: 'collector',
					},
					{
						name: 'Survey',
						value: 'survey',
					},
				],
				default: '',
				required: true,
			},
			{
				displayName: 'Event',
				name: 'event',
				displayOptions: {
					show: {
						objectType: ['survey'],
					},
				},
				type: 'options',
				options: [
					{
						name: 'Collector Created',
						value: 'collector_created',
						description: 'A collector is created',
					},
					{
						name: 'Collector Deleted',
						value: 'collector_deleted',
						description: 'A collector is deleted',
					},
					{
						name: 'Collector Updated',
						value: 'collector_updated',
						description: 'A collector is updated',
					},
					{
						name: 'Response Completed',
						value: 'response_completed',
						description: 'A survey response is completed',
					},
					{
						name: 'Response Created',
						value: 'response_created',
						description: 'A respondent begins a survey',
					},
					{
						name: 'Response Deleted',
						value: 'response_deleted',
						description: 'A response is deleted',
					},
					{
						name: 'Response Disqualified',
						value: 'response_disqualified',
						description: 'A survey response is disqualified',
					},
					{
						name: 'Response Overquota',
						value: 'response_overquota',
						description: 'A response is over a survey’s quota',
					},
					{
						name: 'Response Updated',
						value: 'response_updated',
						description: 'A survey response is updated',
					},
					{
						name: 'Survey Created',
						value: 'survey_created',
						description: 'A survey is created',
					},
					{
						name: 'Survey Deleted',
						value: 'survey_deleted',
						description: 'A survey is deleted',
					},
					{
						name: 'Survey Updated',
						value: 'survey_updated',
						description: 'A survey is updated',
					},
				],
				default: '',
				required: true,
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				displayOptions: {
					show: {
						objectType: ['collector'],
					},
				},
				options: [
					{
						name: 'Collector Deleted',
						value: 'collector_deleted',
						description: 'A collector is deleted',
					},
					{
						name: 'Collector Updated',
						value: 'collector_updated',
						description: 'A collector is updated',
					},
					{
						name: 'Response Completed',
						value: 'response_completed',
						description: 'A survey response is completed',
					},
					{
						name: 'Response Created',
						value: 'response_created',
						description: 'A respondent begins a survey',
					},
					{
						name: 'Response Deleted',
						value: 'response_deleted',
						description: 'A response is deleted',
					},
					{
						name: 'Response Disqualified',
						value: 'response_disqualified',
						description: 'A survey response is disqualified',
					},
					{
						name: 'Response Overquota',
						value: 'response_overquota',
						description: 'A response is over a survey’s quota',
					},
					{
						name: 'Response Updated',
						value: 'response_updated',
						description: 'A survey response is updated',
					},
				],
				default: '',
				required: true,
			},
			{
				displayName: 'Survey Names or IDs',
				name: 'surveyIds',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				displayOptions: {
					show: {
						objectType: ['survey'],
					},
					hide: {
						event: ['survey_created'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getSurveys',
				},
				options: [],
				default: [],
				required: true,
			},
			{
				displayName: 'Survey Name or ID',
				name: 'surveyId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				displayOptions: {
					show: {
						objectType: ['collector'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getSurveys',
				},
				default: [],
				required: true,
			},
			{
				displayName: 'Collector Names or IDs',
				name: 'collectorIds',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				displayOptions: {
					show: {
						objectType: ['collector'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getCollectors',
					loadOptionsDependsOn: ['surveyId'],
				},
				options: [],
				default: [],
				required: true,
			},
			{
				displayName: 'Resolve Data',
				name: 'resolveData',
				type: 'boolean',
				displayOptions: {
					show: {
						event: ['response_completed'],
					},
				},
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default the webhook-data only contain the IDs. If this option gets activated, it will resolve the data automatically.',
			},
			{
				displayName: 'Only Answers',
				name: 'onlyAnswers',
				displayOptions: {
					show: {
						resolveData: [true],
						event: ['response_completed'],
					},
				},
				type: 'boolean',
				default: true,
				description: 'Whether to return only the answers of the form and not any of the other data',
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the survey's collectors to display them to user so that they can
			// select them easily
			async getCollectors(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const surveyId = this.getCurrentNodeParameter('surveyId');
				const returnData: INodePropertyOptions[] = [];
				const collectors = await surveyMonkeyRequestAllItems.call(
					this,
					'data',
					'GET',
					`/surveys/${surveyId}/collectors`,
				);
				for (const collector of collectors) {
					const collectorName = collector.name;
					const collectorId = collector.id;
					returnData.push({
						name: collectorName,
						value: collectorId,
					});
				}
				return returnData;
			},

			// Get all the surveys to display them to user so that they can
			// select them easily
			async getSurveys(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const surveys = await surveyMonkeyRequestAllItems.call(this, 'data', 'GET', '/surveys');
				for (const survey of surveys) {
					const surveyName = survey.title;
					const surveyId = survey.id;
					returnData.push({
						name: surveyName,
						value: surveyId,
					});
				}
				return returnData;
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const objectType = this.getNodeParameter('objectType') as string;
				const event = this.getNodeParameter('event') as string;
				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const endpoint = '/webhooks';

				const responseData = await surveyMonkeyRequestAllItems.call(
					this,
					'data',
					'GET',
					endpoint,
					{},
				);

				const webhookUrl = this.getNodeWebhookUrl('default');

				const ids: string[] = [];

				if (objectType === 'survey' && event !== 'survey_created') {
					const surveyIds = this.getNodeParameter('surveyIds') as string[];
					ids.push.apply(ids, surveyIds);
				} else if (objectType === 'collector') {
					const collectorIds = this.getNodeParameter('collectorIds') as string[];
					ids.push.apply(ids, collectorIds);
				}

				for (const webhook of responseData) {
					const webhookDetails = await surveyMonkeyApiRequest.call(
						this,
						'GET',
						`/webhooks/${webhook.id}`,
					);
					if (
						webhookDetails.subscription_url === webhookUrl &&
						idsExist(webhookDetails.object_ids as string[], ids) &&
						webhookDetails.event_type === event
					) {
						// Set webhook-id to be sure that it can be deleted
						const webhookData = this.getWorkflowStaticData('node');
						webhookData.webhookId = webhook.id as string;
						return true;
					}
				}

				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event') as string;
				const objectType = this.getNodeParameter('objectType') as string;
				const endpoint = '/webhooks';
				const ids: string[] = [];

				if (objectType === 'survey' && event !== 'survey_created') {
					const surveyIds = this.getNodeParameter('surveyIds') as string[];
					ids.push.apply(ids, surveyIds);
				} else if (objectType === 'collector') {
					const collectorIds = this.getNodeParameter('collectorIds') as string[];
					ids.push.apply(ids, collectorIds);
				}

				const body: IDataObject = {
					name: `n8n - Webhook [${event}]`,
					object_type: objectType,
					object_ids: ids,
					subscription_url: webhookUrl,
					event_type: event,
				};

				if (objectType === 'survey' && event === 'survey_created') {
					delete body.object_type;
					delete body.object_ids;
				}

				let responseData: IDataObject = {};

				responseData = await surveyMonkeyApiRequest.call(this, 'POST', endpoint, body);

				if (responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = responseData.id as string;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {
					const endpoint = `/webhooks/${webhookData.webhookId}`;

					try {
						await surveyMonkeyApiRequest.call(this, 'DELETE', endpoint);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registered anymore
					delete webhookData.webhookId;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const event = this.getNodeParameter('event') as string;
		const objectType = this.getNodeParameter('objectType') as string;
		const authenticationMethod = this.getNodeParameter('authentication') as string;
		let credentials: IDataObject;
		const headerData = this.getHeaderData() as IDataObject;
		const req = this.getRequestObject();
		const webhookName = this.getWebhookName();

		if (authenticationMethod === 'accessToken') {
			credentials = await this.getCredentials('surveyMonkeyApi');
		} else {
			credentials = await this.getCredentials('surveyMonkeyOAuth2Api');
		}

		if (webhookName === 'setup') {
			// It is a create webhook confirmation request
			return {};
		}

		if (headerData['sm-signature'] === undefined) {
			return {};
		}

		return new Promise((resolve, _reject) => {
			const data: Buffer[] = [];

			req.on('data', (chunk) => {
				data.push(chunk as Buffer);
			});

			req.on('end', async () => {
				const computedSignature = createHmac(
					'sha1',
					`${credentials.clientId}&${credentials.clientSecret}`,
				)
					.update(data.join(''))
					.digest('base64');
				if (headerData['sm-signature'] !== computedSignature) {
					// Signature is not valid so ignore call
					return {};
				}

				let responseData = jsonParse<any>(data.join(''));
				let endpoint = '';

				let returnItem: INodeExecutionData[] = [
					{
						json: responseData,
					},
				];

				if (event === 'response_completed') {
					const resolveData = this.getNodeParameter('resolveData') as boolean;
					if (resolveData) {
						if (objectType === 'survey') {
							endpoint = `/surveys/${responseData.resources.survey_id}/responses/${responseData.object_id}/details`;
						} else {
							endpoint = `/collectors/${responseData.resources.collector_id}/responses/${responseData.object_id}/details`;
						}
						responseData = await surveyMonkeyApiRequest.call(this, 'GET', endpoint);
						const surveyId = responseData.survey_id;

						const questions: IQuestion[] = [];
						const answers = new Map<string, IAnswer[]>();

						const { pages } = await surveyMonkeyApiRequest.call(
							this,
							'GET',
							`/surveys/${surveyId}/details`,
						);

						for (const page of pages) {
							questions.push.apply(questions, page.questions as IQuestion[]);
						}

						for (const page of responseData.pages as IDataObject[]) {
							for (const question of page.questions as IDataObject[]) {
								answers.set(question.id as string, question.answers as IAnswer[]);
							}
						}

						const responseQuestions = new Map<string, number | string | string[] | IDataObject>();

						for (const question of questions) {
							/*
							TODO: add support for premium components
							- File Upload
							- Matrix of dropdowm menus
							*/

							// if question does not have an answer ignore it
							if (!answers.get(question.id)) {
								continue;
							}

							const heading = question.headings![0].heading as string;

							if (question.family === 'open_ended' || question.family === 'datetime') {
								if (question.subtype !== 'multi') {
									responseQuestions.set(heading, answers.get(question.id)![0].text as string);
								} else {
									const results: IDataObject = {};
									const keys = (question.answers.rows as IRow[]).map((e) => e.text);
									const values = answers.get(question.id)?.map((e) => e.text) as string[];
									for (let i = 0; i < keys.length; i++) {
										// if for some reason there are questions texts repeted add the index to the key
										if (results[keys[i]] !== undefined) {
											results[`${keys[i]}(${i})`] = values[i] || '';
										} else {
											results[keys[i]] = values[i] || '';
										}
									}
									responseQuestions.set(heading, results);
								}
							}

							if (question.family === 'single_choice') {
								const other = question.answers.other as IOther;
								if (
									other?.visible &&
									other.is_answer_choice &&
									answers.get(question.id)![0].other_id
								) {
									responseQuestions.set(heading, answers.get(question.id)![0].text as string);
								} else if (other?.visible && !other.is_answer_choice) {
									const choiceId = answers.get(question.id)![0].choice_id;

									const choice = (question.answers.choices as IChoice[]).filter(
										(e) => e.id === choiceId,
									)[0];

									const comment = answers.get(question.id)?.find((e) => e.other_id === other.id)
										?.text as string;
									responseQuestions.set(heading, { value: choice.text, comment });
								} else {
									const choiceId = answers.get(question.id)![0].choice_id;
									const choice = (question.answers.choices as IChoice[]).filter(
										(e) => e.id === choiceId,
									)[0];
									responseQuestions.set(heading, choice.text);
								}
							}

							if (question.family === 'multiple_choice') {
								const other = question.answers.other as IOther;
								const choiceIds = answers.get(question.id)?.map((e) => e.choice_id);
								const value = (question.answers.choices as IChoice[])
									.filter((e) => choiceIds?.includes(e.id))
									.map((e) => e.text);
								// if "Add an "Other" Answer Option for Comments" is active and was selected
								if (other?.is_answer_choice && other.visible) {
									const text = answers.get(question.id)?.find((e) => e.other_id === other.id)
										?.text as string;
									value.push(text);
								}
								responseQuestions.set(heading, value);
							}

							if (question.family === 'matrix') {
								// if more than one row it's a matrix/rating-scale
								const rows = question.answers.rows as IRow[];

								if (rows.length > 1) {
									const results: IDataObject = {};
									const choiceIds = answers.get(question.id)?.map((e) => e.choice_id) as string[];
									const rowIds = answers.get(question.id)?.map((e) => e.row_id) as string[];

									const rowsValues = (question.answers.rows as IRow[])
										.filter((e) => rowIds.includes(e.id))
										.map((e) => e.text);

									const choicesValues = (question.answers.choices as IChoice[])
										.filter((e) => choiceIds.includes(e.id))
										.map((e) => e.text);

									for (let i = 0; i < rowsValues.length; i++) {
										results[rowsValues[i]] = choicesValues[i] || '';
									}

									// add the rows that were not answered
									for (const row of question.answers.rows as IDataObject[]) {
										if (!rowIds.includes(row.id as string)) {
											results[row.text as string] = '';
										}
									}
									// the comment then add the comment
									const other = question.answers.other as IOther;
									if (other?.visible) {
										results.comment = answers.get(question.id)?.filter((e) => e.other_id)[0].text;
									}

									responseQuestions.set(heading, results);
								} else {
									const choiceIds = answers.get(question.id)?.map((e) => e.choice_id);
									const value = (question.answers.choices as IChoice[])
										.filter((e) => choiceIds!.includes(e.id))
										.map((e) => (e.text === '' ? e.weight : e.text))[0];
									responseQuestions.set(heading, value);

									// if "Add an Other Answer Option for Comments" is active then add comment to the answer
									const other = question.answers.other as IOther;
									if (other?.visible) {
										const response: IDataObject = {};
										//const questionName = (question.answers.other as IOther).text as string;
										const text = answers.get(question.id)?.filter((e) => e.other_id)[0].text;
										response.value = value;
										response.comment = text;
										responseQuestions.set(heading, response);
									}
								}
							}

							if (question.family === 'demographic') {
								const rows: IDataObject = {};
								for (const row of answers.get(question.id) as IAnswer[]) {
									rows[row.row_id as string] = row.text;
								}
								const addressInfo: IDataObject = {};
								for (const answer of question.answers.rows as IDataObject[]) {
									addressInfo[answer.type as string] = rows[answer.id as string] || '';
								}
								responseQuestions.set(heading, addressInfo);
							}

							if (question.family === 'presentation') {
								if (question.subtype === 'image') {
									const { url } = question.headings![0].image as IDataObject;
									responseQuestions.set(heading, url as string);
								}
							}
						}
						delete responseData.pages;
						responseData.questions = {};

						// Map the "Map" to JSON
						const tuples = deepCopy([...responseQuestions]);
						for (const [key, value] of tuples) {
							responseData.questions[key] = value;
						}

						const onlyAnswers = this.getNodeParameter('onlyAnswers') as boolean;
						if (onlyAnswers) {
							responseData = responseData.questions;
						}

						returnItem = [
							{
								json: responseData,
							},
						];
					}
				}

				return resolve({
					workflowData: [returnItem],
				});
			});

			req.on('error', (error) => {
				throw new NodeOperationError(this.getNode(), error);
			});
		});
	}
}
