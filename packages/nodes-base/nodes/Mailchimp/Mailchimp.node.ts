import * as moment from 'moment';

import {
	IExecuteSingleFunctions,
} from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	mailchimpApiRequest,
	validateJSON,
} from './GenericFunctions';

enum Status {
	subscribe = 'subscribe',
	unsubscribed = 'unsubscribe',
	cleaned = 'cleaned',
	pending = 'pending',
	transactional = 'transactional',
}

interface ILocation {
	latitude?: number;
	longitude?: number;
}

interface ICreateMemberBody {
	listId: string;
	email_address: string;
	email_type?: string;
	status?: Status;
	language?: string;
	vip?: boolean;
	location?: ILocation;
	ips_signup?: string;
	timestamp_signup?: string;
	ip_opt?: string;
	timestamp_opt?: string;
	tags?: string[];
	merge_fields?: IDataObject;
}

export class Mailchimp implements INodeType {

	description: INodeTypeDescription = {
		displayName: 'Mailchimp',
		name: 'mailchimp',
		icon: 'file:mailchimp.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Mailchimp API',
		defaults: {
			name: 'Mailchimp',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mailchimpApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Member',
						value: 'member',
						description: 'Add member to list',
					},
				],
				default: 'member',
				required: true,
				description: 'Resource to consume.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'member',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new member on list',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			{
				displayName: 'List',
				name: 'list',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLists',
				},
				displayOptions: {
					show: {
						resource: [
							'member',
						],
						operation: [
							'create',
						],
					},
				},
				default: '',
				options: [],
				required: true,
				description: 'List of lists',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'member',
						],
						operation: [
							'create',
						],
					},
				},
				default: '',
				description: 'Email address for a subscriber.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'member',
						],
						operation: [
							'create',
						],
					},
				},
				options: [
					{
						name: 'Subscribed',
						value: 'subscribed',
						description: '',
					},
					{
						name: 'Unsubscribed',
						value: 'unsubscribed',
						description: '',
					},
					{
						name: 'Cleaned',
						value: 'cleaned',
						description: '',
					},
					{
						name: 'Pending',
						value: 'pending',
						description: '',
					},
					{
						name: 'Transactional',
						value: 'transactional',
						description: '',
					},
				],
				default: '',
				description: `Subscriber's current status.`,
			},
			{
				displayName: 'JSON Parameters',
				name: 'jsonParameters',
				type: 'boolean',
				default: false,
				description: '',
				displayOptions: {
					show: {
						resource:[
							'member'
						],
						operation: [
							'create',
						],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource:[
							'member',
						],
						operation: [
							'create',
						],
					},
				},
				options: [
					{
						displayName: 'Email Type',
						name: 'emailType',
						type: 'options',
						options: [
							{
								name: 'Email',
								value: 'email',
								description: '',
							},
							{
								name: 'Text',
								value: 'text',
								description: '',
							},
						],
						default: '',
						description: 'Type of email this member asked to get',
					},
					{
						displayName: 'Signup IP',
						name: 'ipSignup',
						type: 'string',
						default: '',
						description: 'IP address the subscriber signed up from.',
					},
					{
						displayName: 'Opt-in IP',
						name: 'ipOptIn',
						type: 'string',
						default: '',
						description: 'The IP address the subscriber used to confirm their opt-in status.',
					},
					{
						displayName: 'Signup Timestamp',
						name: 'timestampSignup',
						type: 'dateTime',
						default: '',
						description: 'The date and time the subscriber signed up for the list in ISO 8601 format.',
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'string',
						default: '',
						description: `If set/detected, the subscriber's language.`,
					},
					{
						displayName: 'Vip',
						name: 'vip',
						type: 'boolean',
						default: false,
						description: `Vip status for subscribers`,
					},
					{
						displayName: 'Opt-in Timestamp',
						name: 'timestampOpt',
						type: 'dateTime',
						default: '',
						description: `The date and time the subscribe confirmed their opt-in status in ISO 8601 format.`,
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description: `The tags that are associated with a member separeted by ,.`,
					},
				]
			},
			{
				displayName: 'Location',
				name: 'locationFieldsUi',
				type: 'fixedCollection',
				placeholder: 'Add Location',
				default: {},
				description: `Subscriber location information.n`,
				displayOptions: {
					show: {
						resource:[
							'member',
						],
						operation: [
							'create',
						],
						jsonParameters: [
							false,
						],
					},
				},
				options: [
					{
						name: 'locationFieldsValues',
						displayName: 'Location',
						values: [
							{
								displayName: 'Latitude',
								name: 'latitude',
								type: 'string',
								required: true,
								description: 'The location latitude.',
								default: '',
							},
							{
								displayName: 'Longitude',
								name: 'longitude',
								type: 'string',
								required: true,
								description: 'The location longitude.',
								default: '',
							},
						],
					}
				],
			},
			{
				displayName: 'Merge Fields',
				name: 'mergeFieldsUi',
				placeholder: 'Add Merge Fields',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource:[
							'member'
						],
						operation: [
							'create',
						],
						jsonParameters: [
							false,
						],
					},
				},
				description: 'An individual merge var and value for a member.',
				options: [
					{
						name: 'mergeFieldsValues',
						displayName: 'Field',
						typeOptions: {
							multipleValueButtonText: 'Add Field',
						},
						values: [
							{
								displayName: 'Field Name',
								name: 'name',
								type: 'string',
								required: true,
								description: 'Merge Field name',
								default: '',
							},
							{
								displayName: 'Field Value',
								name: 'value',
								required: true,
								type: 'string',
								default: '',
								description: 'Merge field value.',
							},
						],
					},
				],
			},
			{
				displayName: 'Merge Fields',
				name: 'mergeFieldsJson',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: '',
				displayOptions: {
					show: {
						resource:[
							'member',
						],
						operation: [
							'create',
						],
						jsonParameters: [
							true,
						],
					},
				},
			},
			{
				displayName: 'Location',
				name: 'locationJson',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: '',
				displayOptions: {
					show: {
						resource:[
							'member',
						],
						operation: [
							'create',
						],
						jsonParameters: [
							true,
						],
					},
				},
			},
		]
	};


	methods = {
		loadOptions: {

			// Get all the available lists to display them to user so that he can
			// select them easily
			async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let lists, response;
				try {
					response = await mailchimpApiRequest.call(this, '/lists', 'GET');
					lists = response.lists;
				} catch (err) {
					throw new Error(`Mailchimp Error: ${err}`);
				}
				for (const list of lists) {
					const listName = list.name;
					const listId = list.id;

					returnData.push({
						name: listName,
						value: listId,
					});
				}
				return returnData;
			},
		}
	};

	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
		let response = {};
		const resource = this.getNodeParameter('resource') as string;
		const operation = this.getNodeParameter('operation') as string;

		if (resource === 'member') {
			if (operation === 'create') {

				const listId = this.getNodeParameter('list') as string;
				const email = this.getNodeParameter('email') as string;
				const status = this.getNodeParameter('status') as Status;
				const options = this.getNodeParameter('options') as IDataObject;
				const jsonActive = this.getNodeParameter('jsonParameters') as IDataObject;

				const body: ICreateMemberBody = {
					listId,
					email_address: email,
					status
				};
				if (options.emailType) {
					body.email_type = options.emailType as string;
				}
				if (options.languaje) {
					body.language = options.language as string;
				}
				if (options.vip) {
					body.vip = options.vip as boolean;
				}
				if (options.ipSignup) {
					body.ips_signup = options.ipSignup as string;
				}
				if (options.ipOptIn) {
					body.ip_opt = options.ipOptIn as string;
				}
				if (options.timestampOpt) {
					body.timestamp_opt = moment(options.timestampOpt as string).format('YYYY-MM-DD HH:MM:SS') as string;
				}
				if (options.timestampSignup) {
					body.timestamp_signup = moment(options.timestampSignup as string).format('YYYY-MM-DD HH:MM:SS') as string;
				}
				if (options.tags) {
					// @ts-ignore
					body.tags = options.tags.split(',') as string[];
				}
				if (!jsonActive) {
					const locationValues = (this.getNodeParameter('locationFieldsUi') as IDataObject).locationFieldsValues as IDataObject;
					if (locationValues) {
						const location: ILocation = {};
						for (const key of Object.keys(locationValues)) {
							if (key === 'latitude') {
								location.latitude = parseInt(locationValues[key] as string, 10) as number;
							} else if (key === 'longitude') {
								location.longitude = parseInt(locationValues[key] as string, 10) as number;
							}
						}
						body.location = location;
					}
					const mergeFieldsValues = (this.getNodeParameter('mergeFieldsUi') as IDataObject).mergeFieldsValues as IDataObject[];
					if (mergeFieldsValues) {
						const mergeFields = {};
						for (let i = 0; i < mergeFieldsValues.length; i++) {
							// @ts-ignore
							mergeFields[mergeFieldsValues[i].name] = mergeFieldsValues[i].value;
						}
						body.merge_fields = mergeFields;
					}
				} else {
					const locationJson = validateJSON(this.getNodeParameter('locationJson') as string);
					const mergeFieldsJson = validateJSON(this.getNodeParameter('mergeFieldsJson') as string);
					if (locationJson) {
						body.location = locationJson;
					}
					if (mergeFieldsJson) {
						body.merge_fields = mergeFieldsJson;
					}
				}
				try {
					response = await mailchimpApiRequest.call(this, `/lists/${listId}/members`, 'POST', body);
				} catch (err) {
					throw new Error(`Mailchimp Error: ${JSON.stringify(err)}`);
				}
			}
		}
		return {
			json: response,
		};
	}
}
