import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeTypeDescription,
	INodePropertyOptions,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

import {
	apiRequest,
	IAttachment,
} from './GenericFunctions';


export class Mattermost implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mattermost',
		name: 'mattermost',
		icon: 'file:mattermost.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to Mattermost',
		defaults: {
			name: 'Mattermost',
			color: '#0058CC',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mattermostApi',
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
						name: 'Channel',
						value: 'channel',
					},
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'message',
				description: 'The resource to operate on.',
			},



			// ----------------------------------
			//         operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'channel',
						],
					},
				},
				options: [
					{
						name: 'Add User',
						value: 'addUser',
						description: 'Add a user to a channel',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new channel',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Soft-deletes a channel',
					},
					{
						name: 'Restore',
						value: 'restore',
						description: 'Restores a soft-deleted channel',
					},
					{
						name: 'Statistics',
						value: 'statistics',
						description: 'Get statistics for a channel.',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'message',
						],
					},
				},
				options: [
					{
						name: 'Delete',
						value: 'delete',
						description: 'Soft deletes a post, by marking the post as deleted in the database.',
					},
					{
						name: 'Post',
						value: 'post',
						description: 'Post a message into a channel',
					},
				],
				default: 'post',
				description: 'The operation to perform.',
			},



			// ----------------------------------
			//         channel
			// ----------------------------------

			// ----------------------------------
			//         channel:create
			// ----------------------------------
			{
				displayName: 'Team ID',
				name: 'teamId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTeams',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create'
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The Mattermost Team.',
			},
			{
				displayName: 'Display Name',
				name: 'displayName',
				type: 'string',
				default: '',
				placeholder: 'Announcements',
				displayOptions: {
					show: {
						operation: [
							'create'
						],
						resource: [
							'channel',
						],
					},
				},
				required: true,
				description: 'The non-unique UI name for the channel.',
			},
			{
				displayName: 'Name',
				name: 'channel',
				type: 'string',
				default: '',
				placeholder: 'announcements',
				displayOptions: {
					show: {
						operation: [
							'create'
						],
						resource: [
							'channel',
						],
					},
				},
				required: true,
				description: 'The unique handle for the channel, will be present in the channel URL.',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				displayOptions: {
					show: {
						operation: [
							'create'
						],
						resource: [
							'channel',
						],
					},
				},
				options: [
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Public',
						value: 'public',
					},
				],
				default: 'public',
				description: 'The type of channel to create.',
			},


			// ----------------------------------
			//         channel:delete
			// ----------------------------------
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'delete'
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The ID of the channel to soft-delete.',
			},


			// ----------------------------------
			//         channel:restore
			// ----------------------------------
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'restore'
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The ID of the channel to restore.',
			},


			// ----------------------------------
			//         channel:addUser
			// ----------------------------------
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'addUser'
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The ID of the channel to invite user to.',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'addUser'
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The ID of the user to invite into channel.',
			},


			// ----------------------------------
			//         channel:statistics
			// ----------------------------------
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'statistics'
						],
						resource: [
							'channel',
						],
					},
				},
				description: 'The ID of the channel to get the statistics from.',
			},

			// ----------------------------------
			//         message
			// ----------------------------------

			// ----------------------------------
			//         message:delete
			// ----------------------------------
			{
				displayName: 'Post ID',
				name: 'postId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'delete',
						],
					},
				},
				default: '',
				description: 'ID of the post to delete',
			},

			// ----------------------------------
			//         message:post
			// ----------------------------------
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'post'
						],
						resource: [
							'message',
						],
					},
				},
				description: 'The ID of the channel to post to.',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				displayOptions: {
					show: {
						operation: [
							'post'
						],
						resource: [
							'message',
						],
					},
				},
				description: 'The text to send.',
			},
			{
				displayName: 'Attachments',
				name: 'attachments',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add attachment',
				},
				displayOptions: {
					show: {
						operation: [
							'post'
						],
						resource: [
							'message',
						],
					},
				},
				default: {},
				description: 'The attachment to add',
				placeholder: 'Add attachment item',
				options: [
					{
						displayName: 'Fallback Text',
						name: 'fallback',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'Required plain-text summary of the attachment.',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'Text to send.',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'Title of the message.',
					},
					{
						displayName: 'Title Link',
						name: 'title_link',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'Link of the title.',
					},
					{
						displayName: 'Color',
						name: 'color',
						type: 'color',
						default: '#ff0000',
						description: 'Color of the line left of text.',
					},
					{
						displayName: 'Pretext',
						name: 'pretext',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'Text which appears before the message block.',
					},
					{
						displayName: 'Author Name',
						name: 'author_name',
						type: 'string',
						default: '',
						description: 'Name that should appear.',
					},
					{
						displayName: 'Author Link',
						name: 'author_link',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'Link for the author.',
					},
					{
						displayName: 'Author Icon',
						name: 'author_icon',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'Icon which should appear for the user.',
					},
					{
						displayName: 'Image URL',
						name: 'image_url',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'URL of image.',
					},
					{
						displayName: 'Thumbnail URL',
						name: 'thumb_url',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'URL of thumbnail.',
					},
					{
						displayName: 'Footer',
						name: 'footer',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'Text of footer to add.',
					},
					{
						displayName: 'Footer Icon',
						name: 'footer_icon',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'Icon which should appear next to footer.',
					},
					
					
					{	displayName: 'Actions',
						name: 'actions',
						placeholder: 'Add Actions',
						description: 'Actions to add to message.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								displayName: 'Item',
								name: 'item',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the Action.',
									},


									{	
									displayName: 'Integrations',
									name: 'integrations',
									placeholder: 'Add Integrations',
									description: 'Integrations to add to message.',
									type: 'fixedCollection',
									typeOptions: {
										multipleValues: true,
									},
									default: {},
									options: [
										{
											displayName: 'Item',
											name: 'item',
											default: {},
											values: [
												{
													displayName: 'URL',
													name: 'url',
													type: 'string',
													default: '',
													description: 'URL of the Integration.',
												},
// context

												{
													displayName: 'Context',
													name: 'context',
													placeholder: 'Add Context to Integration',
													description: 'Adds a Context values set.',
													type: 'fixedCollection',
													typeOptions: {
															multipleValues: true,
													},
													default: {},
													options: [
															{
																	name: 'property',
																	displayName: 'Property',
																	default: {},
																	values: [
																			{
																					displayName: 'Property Name',
																					name: 'name',
																					type: 'string',
																					default: '',
																					description: 'Name of the property to set.',
																			},
																			{
																					displayName: 'Property Value',
																					name: 'value',
																					type: 'string',
																					default: '',
																					description: 'Value of the property to set.',
																			},
																	]
															},
													],
												},








											
											]
										},
									],
								},



								
								]
							},
						],
					},
					

					
					
					
					
					
					
					
					
					
					
					
					
					
					
					
					{
						displayName: 'Fields',
						name: 'fields',
						placeholder: 'Add Fields',
						description: 'Fields to add to message.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'item',
								displayName: 'Item',
								values: [
									{
										displayName: 'Title',
										name: 'title',
										type: 'string',
										default: '',
										description: 'Title of the item.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the item.',
									},
									{
										displayName: 'Short',
										name: 'short',
										type: 'boolean',
										default: true,
										description: 'If items can be displayed next to each other.',
									},
								]
							},
						],
					}
				],
			},
			{
				displayName: 'Other Options',
				name: 'otherOptions',
				type: 'collection',
				displayOptions: {
					show: {
						operation: [
							'post'
						],
						resource: [
							'message',
						],
					},
				},
				default: {},
				description: 'Other options to set',
				placeholder: 'Add options',
				options: [
					{
						displayName: 'Make Comment',
						name: 'root_id',
						type: 'string',
						default: '',
						description: 'The post ID to comment on',
					},
				],
			},
			// ----------------------------------
			//              user
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'user',
						],
					},
				},
				options: [
					{
						name: 'Deactive',
						value: 'deactive',
						description: 'Deactivates the user and revokes all its sessions by archiving its user object.',
					},
				],
				default: '',
				description: 'The operation to perform.',
			},
			// ----------------------------------
			//         user:deactivate
			// ----------------------------------
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'user',
						],
						operation: [
							'deactive',
						],
					},
				},
				default: '',
				description: 'User GUID'
			},

		],
	};

	methods = {
		loadOptions: {
			// Get all the available channels
			async getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = 'channels';
				const responseData = await apiRequest.call(this, 'GET', endpoint, {});

				if (responseData === undefined) {
					throw new Error('No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				let name: string;
				for (const data of responseData) {
					if (data.delete_at !== 0) {
						continue;
					}

					name = `${data.name} (${data.type === 'O' ? 'public' : 'private'})`;

					returnData.push({
						name,
						value: data.id,
					});
				}

				return returnData;
			},



			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = 'teams';
				const responseData = await apiRequest.call(this, 'GET', endpoint, {});

				if (responseData === undefined) {
					throw new Error('No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				let name: string;
				for (const data of responseData) {

					if (data.delete_at !== 0) {
						continue;
					}

					name = `${data.display_name} (${data.type === 'O' ? 'public' : 'private'})`;

					returnData.push({
						name,
						value: data.id,
					});
				}

				return returnData;
			},
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = 'users';
				const responseData = await apiRequest.call(this, 'GET', endpoint, {});

				if (responseData === undefined) {
					throw new Error('No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				for (const data of responseData) {

					if (data.delete_at !== 0) {
						continue;
					}

					returnData.push({
						name: data.username,
						value: data.id,
					});
				}

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const credentials = this.getCredentials('mattermostApi');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		let operation: string;
		let resource: string;
		let requestMethod = 'POST';

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		for (let i = 0; i < items.length; i++) {
			let endpoint = '';
			body = {};
			qs = {};

			resource = this.getNodeParameter('resource', i) as string;
			operation = this.getNodeParameter('operation', i) as string;

			if (resource === 'channel') {
				if (operation === 'create') {
					// ----------------------------------
					//         channel:create
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = 'channels';

					body.team_id = this.getNodeParameter('teamId', i) as string;
					body.displayName = this.getNodeParameter('displayName', i) as string;
					body.name = this.getNodeParameter('channel', i) as string;

					const type = this.getNodeParameter('type', i) as string;
					body.type = type === 'public' ? 'O' : 'P';

				} else if (operation === 'delete') {
					// ----------------------------------
					//         channel:delete
					// ----------------------------------

					requestMethod = 'DELETE';
					const channelId = this.getNodeParameter('channelId', i) as string;
					endpoint = `channels/${channelId}`;

				} else if (operation === 'restore') {
					// ----------------------------------
					//         channel:restore
					// ----------------------------------

					requestMethod = 'POST';
					const channelId = this.getNodeParameter('channelId', i) as string;
					endpoint = `channels/${channelId}/restore`;

				} else if (operation === 'addUser') {
					// ----------------------------------
					//         channel:addUser
					// ----------------------------------

					requestMethod = 'POST';

					const channelId = this.getNodeParameter('channelId', i) as string;
					body.user_id = this.getNodeParameter('userId', i) as string;

					endpoint = `channels/${channelId}/members`;

				} else if (operation === 'statistics') {
					// ----------------------------------
					//         channel:statistics
					// ----------------------------------

					requestMethod = 'GET';
					const channelId = this.getNodeParameter('channelId', i) as string;
					endpoint = `channels/${channelId}/stats`;
				}
			} else if (resource === 'message') {
				if (operation === 'delete') {
					// ----------------------------------
					//          message:delete
					// ----------------------------------

					const postId = this.getNodeParameter('postId', i) as string;
					requestMethod = 'DELETE';
					endpoint = `posts/${postId}`;
				} else if (operation === 'post') {
					// ----------------------------------
					//         message:post
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = 'posts';

					body.channel_id = this.getNodeParameter('channelId', i) as string;
					body.message = this.getNodeParameter('message', i) as string;

					const attachments = this.getNodeParameter('attachments', i, []) as unknown as IAttachment[];
                                        console.log('----');
					console.dir(attachments);
					console.log('----');
					// The node does save the fields data differently than the API
					// expects so fix the data befre we send the request
					for (const attachment of attachments) {
						if (attachment.fields !== undefined) {
							if (attachment.fields.item !== undefined) {
								// Move the field-content up
								// @ts-ignore
								attachment.fields = attachment.fields.item;
							} else {
								// If it does not have any items set remove it
								delete attachment.fields;
							}
						};
						if (attachment.actions !== undefined) {
							if (attachment.actions.item !== undefined) {
								// Move the field-content up
								// @ts-ignore
								attachment.actions = attachment.actions.item;
							} else {
								// If it does not have any items set remove it
								delete attachment.actions;
							}
						};
					}
                                        const util = require('util');
					console.log('&&&&');
					//console.dir(attachments);
			                console.log(util.inspect(attachments, false, null, true /* enable colors */));
					console.log('&&&&');
					
					body.props = {
						attachments,
					};

					//console.log('####');
					//console.dir(body);
					//console.log('####');
					console.log('****');
					console.log(util.inspect(body, false, null, true /* enable colors */));
					//console.dir(body);
					//console.log('****111');
					//console.log(JSON.stringify(body, null, 4));
					console.log('****');
					// Add all the other options to the request
					const otherOptions = this.getNodeParameter('otherOptions', i) as IDataObject;
					Object.assign(body, otherOptions);
				}
			} else if (resource === 'user') {
				// TODO: Remove the "deactive" again in the future. In here temporary
				//       to not break workflows for people which set the option before
				//       typo got fixed. JO 2020-01-17
				if (operation === 'deactive' || operation === 'desactive') {
					// ----------------------------------
					//          user:deactive
					// ----------------------------------
					const userId = this.getNodeParameter('userId', i) as string;
					requestMethod = 'DELETE';
					endpoint = `users/${userId}`;
				}
			}
			else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
			returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
