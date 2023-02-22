import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	mispApiRequest,
	mispApiRequestAllItems,
	throwOnEmptyUpdate,
	throwOnInvalidUrl,
	throwOnMissingSharingGroup,
} from './GenericFunctions';

import {
	attributeFields,
	attributeOperations,
	eventFields,
	eventOperations,
	eventTagFields,
	eventTagOperations,
	feedFields,
	feedOperations,
	galaxyFields,
	galaxyOperations,
	noticelistFields,
	noticelistOperations,
	organisationFields,
	organisationOperations,
	tagFields,
	tagOperations,
	userFields,
	userOperations,
	warninglistFields,
	warninglistOperations,
} from './descriptions';

import type { LoadedOrgs, LoadedSharingGroups, LoadedTags, LoadedUsers } from './types';

export class Misp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MISP',
		name: 'misp',
		icon: 'file:misp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the MISP API',
		defaults: {
			name: 'MISP',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mispApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Attribute',
						value: 'attribute',
					},
					{
						name: 'Event',
						value: 'event',
					},
					{
						name: 'Event Tag',
						value: 'eventTag',
					},
					{
						name: 'Feed',
						value: 'feed',
					},
					{
						name: 'Galaxy',
						value: 'galaxy',
					},
					{
						name: 'Noticelist',
						value: 'noticelist',
					},
					{
						name: 'Organisation',
						value: 'organisation',
					},
					{
						name: 'Tag',
						value: 'tag',
					},
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Warninglist',
						value: 'warninglist',
					},
				],
				default: 'attribute',
			},
			...attributeOperations,
			...attributeFields,
			...eventOperations,
			...eventFields,
			...eventTagOperations,
			...eventTagFields,
			...feedOperations,
			...feedFields,
			...galaxyOperations,
			...galaxyFields,
			...noticelistOperations,
			...noticelistFields,
			...organisationOperations,
			...organisationFields,
			...tagOperations,
			...tagFields,
			...userOperations,
			...userFields,
			...warninglistOperations,
			...warninglistFields,
		],
	};

	methods = {
		loadOptions: {
			async getOrgs(this: ILoadOptionsFunctions) {
				const responseData = (await mispApiRequest.call(
					this,
					'GET',
					'/organisations',
				)) as LoadedOrgs;
				return responseData.map((i) => ({ name: i.Organisation.name, value: i.Organisation.id }));
			},

			async getSharingGroups(this: ILoadOptionsFunctions) {
				const responseData = (await mispApiRequest.call(
					this,
					'GET',
					'/sharing_groups',
				)) as LoadedSharingGroups;
				return responseData.response.map((i) => ({
					name: i.SharingGroup.name,
					value: i.SharingGroup.id,
				}));
			},

			async getTags(this: ILoadOptionsFunctions) {
				const responseData = (await mispApiRequest.call(this, 'GET', '/tags')) as LoadedTags;
				return responseData.Tag.map((i) => ({ name: i.name, value: i.id }));
			},

			async getUsers(this: ILoadOptionsFunctions) {
				const responseData = (await mispApiRequest.call(
					this,
					'GET',
					'/admin/users',
				)) as LoadedUsers;
				return responseData.map((i) => ({ name: i.User.email, value: i.User.id }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'attribute') {
					// **********************************************************************
					//                               attribute
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//            attribute: create
						// ----------------------------------------

						const body = {
							type: this.getNodeParameter('type', i),
							value: this.getNodeParameter('value', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						throwOnMissingSharingGroup.call(this, additionalFields);

						if (Object.keys(additionalFields)) {
							Object.assign(body, additionalFields);
						}

						const eventId = this.getNodeParameter('eventId', i);
						const endpoint = `/attributes/add/${eventId}`;
						responseData = await mispApiRequest.call(this, 'POST', endpoint, body);
						responseData = responseData.Attribute;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//            attribute: delete
						// ----------------------------------------

						const attributeId = this.getNodeParameter('attributeId', i);
						const endpoint = `/attributes/delete/${attributeId}`;
						responseData = await mispApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//              attribute: get
						// ----------------------------------------

						const attributeId = this.getNodeParameter('attributeId', i);
						const endpoint = `/attributes/view/${attributeId}`;
						responseData = await mispApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.Attribute;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//            attribute: getAll
						// ----------------------------------------

						responseData = await mispApiRequestAllItems.call(this, '/attributes');
					} else if (operation === 'update') {
						// ----------------------------------------
						//            attribute: update
						// ----------------------------------------

						const body = {};
						const updateFields = this.getNodeParameter('updateFields', i);

						throwOnEmptyUpdate.call(this, resource, updateFields);
						throwOnMissingSharingGroup.call(this, updateFields);

						Object.assign(body, updateFields);

						const attributeId = this.getNodeParameter('attributeId', i);
						const endpoint = `/attributes/edit/${attributeId}`;
						responseData = await mispApiRequest.call(this, 'PUT', endpoint, body);
						responseData = responseData.Attribute;
					}
				} else if (resource === 'event') {
					// **********************************************************************
					//                                 event
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//              event: create
						// ----------------------------------------

						const body = {
							org_id: this.getNodeParameter('org_id', i),
							info: this.getNodeParameter('information', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						throwOnMissingSharingGroup.call(this, additionalFields);

						if (Object.keys(additionalFields)) {
							Object.assign(body, additionalFields);
						}

						responseData = await mispApiRequest.call(this, 'POST', '/events', body);
						responseData = responseData.Event;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//              event: delete
						// ----------------------------------------

						const eventId = this.getNodeParameter('eventId', i);
						const endpoint = `/events/delete/${eventId}`;
						responseData = await mispApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//                event: get
						// ----------------------------------------

						const eventId = this.getNodeParameter('eventId', i);
						const endpoint = `/events/view/${eventId}`;
						responseData = await mispApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.Event;
						delete responseData.Attribute; // prevent excessive payload size
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//              event: getAll
						// ----------------------------------------

						responseData = await mispApiRequestAllItems.call(this, '/events');
					} else if (operation === 'publish') {
						// ----------------------------------------
						//              event: publish
						// ----------------------------------------

						const eventId = this.getNodeParameter('eventId', i);
						const endpoint = `/events/publish/${eventId}`;
						responseData = await mispApiRequest.call(this, 'POST', endpoint);
					} else if (operation === 'unpublish') {
						// ----------------------------------------
						//             event: unpublish
						// ----------------------------------------

						const eventId = this.getNodeParameter('eventId', i);

						const endpoint = `/events/unpublish/${eventId}`;
						responseData = await mispApiRequest.call(this, 'POST', endpoint);
					} else if (operation === 'update') {
						// ----------------------------------------
						//              event: update
						// ----------------------------------------

						const body = {};
						const updateFields = this.getNodeParameter('updateFields', i);

						throwOnEmptyUpdate.call(this, resource, updateFields);
						throwOnMissingSharingGroup.call(this, updateFields);

						Object.assign(body, updateFields);

						const eventId = this.getNodeParameter('eventId', i);
						const endpoint = `/events/edit/${eventId}`;
						responseData = await mispApiRequest.call(this, 'PUT', endpoint, body);
						responseData = responseData.Event;
						delete responseData.Attribute; // prevent excessive payload size
					}
				} else if (resource === 'eventTag') {
					if (operation === 'add') {
						// ----------------------------------------
						//             eventTag: add
						// ----------------------------------------

						const body = {
							event: this.getNodeParameter('eventId', i),
							tag: this.getNodeParameter('tagId', i),
						};

						const endpoint = '/events/addTag';
						responseData = await mispApiRequest.call(this, 'POST', endpoint, body);
					} else if (operation === 'remove') {
						// ----------------------------------------
						//             eventTag: remove
						// ----------------------------------------

						const eventId = this.getNodeParameter('eventId', i);
						const tagId = this.getNodeParameter('tagId', i);

						const endpoint = `/events/removeTag/${eventId}/${tagId}`;
						responseData = await mispApiRequest.call(this, 'POST', endpoint);
					}
				} else if (resource === 'feed') {
					// **********************************************************************
					//                                  feed
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//               feed: create
						// ----------------------------------------

						const url = this.getNodeParameter('url', i) as string;

						throwOnInvalidUrl.call(this, url);

						const body = {
							name: this.getNodeParameter('name', i),
							provider: this.getNodeParameter('provider', i),
							url,
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields)) {
							Object.assign(body, additionalFields);
						}

						responseData = await mispApiRequest.call(this, 'POST', '/feeds/add', body);
						responseData = responseData.Feed;
					} else if (operation === 'disable') {
						// ----------------------------------------
						//              feed: disable
						// ----------------------------------------

						const feedId = this.getNodeParameter('feedId', i);

						const endpoint = `/feeds/disable/${feedId}`;
						responseData = await mispApiRequest.call(this, 'POST', endpoint);
					} else if (operation === 'enable') {
						// ----------------------------------------
						//               feed: enable
						// ----------------------------------------

						const feedId = this.getNodeParameter('feedId', i);
						const endpoint = `/feeds/enable/${feedId}`;
						responseData = await mispApiRequest.call(this, 'POST', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//                feed: get
						// ----------------------------------------

						const feedId = this.getNodeParameter('feedId', i);
						responseData = await mispApiRequest.call(this, 'GET', `/feeds/view/${feedId}`);
						responseData = responseData.Feed;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               feed: getAll
						// ----------------------------------------

						responseData = (await mispApiRequestAllItems.call(this, '/feeds')) as Array<{
							Feed: unknown;
						}>;
						responseData = responseData.map((entry) => entry.Feed);
					} else if (operation === 'update') {
						// ----------------------------------------
						//               feed: update
						// ----------------------------------------

						const body = {};
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject & {
							url: string;
						};

						throwOnEmptyUpdate.call(this, resource, updateFields);

						if (updateFields.url) {
							throwOnInvalidUrl.call(this, updateFields.url);
						}

						Object.assign(body, updateFields);

						const feedId = this.getNodeParameter('feedId', i);
						responseData = await mispApiRequest.call(this, 'PUT', `/feeds/edit/${feedId}`, body);
						responseData = responseData.Feed;
					}
				} else if (resource === 'galaxy') {
					// **********************************************************************
					//                                 galaxy
					// **********************************************************************

					if (operation === 'delete') {
						// ----------------------------------------
						//              galaxy: delete
						// ----------------------------------------

						const galaxyId = this.getNodeParameter('galaxyId', i);
						const endpoint = `/galaxies/delete/${galaxyId}`;
						responseData = await mispApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//               galaxy: get
						// ----------------------------------------

						const galaxyId = this.getNodeParameter('galaxyId', i);
						const endpoint = `/galaxies/view/${galaxyId}`;
						responseData = await mispApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.Galaxy;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//              galaxy: getAll
						// ----------------------------------------

						responseData = (await mispApiRequestAllItems.call(this, '/galaxies')) as Array<{
							Galaxy: unknown;
						}>;
						responseData = responseData.map((entry) => entry.Galaxy);
					}
				} else if (resource === 'noticelist') {
					// **********************************************************************
					//                               noticelist
					// **********************************************************************

					if (operation === 'get') {
						// ----------------------------------------
						//             noticelist: get
						// ----------------------------------------

						const noticelistId = this.getNodeParameter('noticelistId', i);
						const endpoint = `/noticelists/view/${noticelistId}`;
						responseData = await mispApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.Noticelist;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//            noticelist: getAll
						// ----------------------------------------

						responseData = (await mispApiRequestAllItems.call(this, '/noticelists')) as Array<{
							Noticelist: unknown;
						}>;
						responseData = responseData.map((entry) => entry.Noticelist);
					}
				} else if (resource === 'organisation') {
					// **********************************************************************
					//                              organisation
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//           organisation: create
						// ----------------------------------------

						const body = {
							name: this.getNodeParameter('name', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields)) {
							Object.assign(body, additionalFields);
						}

						const endpoint = '/admin/organisations/add';
						responseData = await mispApiRequest.call(this, 'POST', endpoint, body);
						responseData = responseData.Organisation;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//           organisation: delete
						// ----------------------------------------

						const organisationId = this.getNodeParameter('organisationId', i);
						const endpoint = `/admin/organisations/delete/${organisationId}`;
						responseData = await mispApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//            organisation: get
						// ----------------------------------------

						const organisationId = this.getNodeParameter('organisationId', i);
						const endpoint = `/organisations/view/${organisationId}`;
						responseData = await mispApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.Organisation;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//           organisation: getAll
						// ----------------------------------------

						responseData = (await mispApiRequestAllItems.call(this, '/organisations')) as Array<{
							Organisation: unknown;
						}>;
						responseData = responseData.map((entry) => entry.Organisation);
					} else if (operation === 'update') {
						// ----------------------------------------
						//           organisation: update
						// ----------------------------------------

						const body = {};
						const updateFields = this.getNodeParameter('updateFields', i);
						throwOnEmptyUpdate.call(this, resource, updateFields);
						Object.assign(body, updateFields);

						const organisationId = this.getNodeParameter('organisationId', i);
						const endpoint = `/admin/organisations/edit/${organisationId}`;
						responseData = await mispApiRequest.call(this, 'PUT', endpoint, body);
						responseData = responseData.Organisation;
					}
				} else if (resource === 'tag') {
					// **********************************************************************
					//                                  tag
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//               tag: create
						// ----------------------------------------

						const body = {
							name: this.getNodeParameter('name', i),
						};

						const { colour } = this.getNodeParameter('additionalFields', i) as {
							name?: string;
							colour?: string;
						};

						if (colour) {
							Object.assign(body, {
								colour: !colour.startsWith('#') ? `#${colour}` : colour,
							});
						}

						responseData = await mispApiRequest.call(this, 'POST', '/tags/add', body);
						responseData = responseData.Tag;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               tag: delete
						// ----------------------------------------

						const tagId = this.getNodeParameter('tagId', i);
						responseData = await mispApiRequest.call(this, 'POST', `/tags/delete/${tagId}`);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               tag: getAll
						// ----------------------------------------

						responseData = (await mispApiRequest.call(this, 'GET', '/tags')) as LoadedTags;

						const returnAll = this.getNodeParameter('returnAll', 0);

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', 0);
							responseData = responseData.Tag.slice(0, limit);
						}
					} else if (operation === 'update') {
						// ----------------------------------------
						//               tag: update
						// ----------------------------------------

						const body = {};
						const updateFields = this.getNodeParameter('updateFields', i) as {
							colour?: string;
							name?: string;
						};
						throwOnEmptyUpdate.call(this, resource, updateFields);
						Object.assign(body, updateFields);

						const { colour, name } = updateFields;

						Object.assign(body, {
							...(name && { name }),
							...(colour && { colour: !colour.startsWith('#') ? `#${colour}` : colour }),
						});

						const tagId = this.getNodeParameter('tagId', i);
						responseData = await mispApiRequest.call(this, 'POST', `/tags/edit/${tagId}`, body);
						responseData = responseData.Tag;
					}
				} else if (resource === 'user') {
					// **********************************************************************
					//                                  user
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//               user: create
						// ----------------------------------------

						const body = {
							email: this.getNodeParameter('email', i),
							role_id: this.getNodeParameter('role_id', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields)) {
							Object.assign(body, additionalFields);
						}

						responseData = await mispApiRequest.call(this, 'POST', '/admin/users/add', body);
						responseData = responseData.User;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               user: delete
						// ----------------------------------------

						const userId = this.getNodeParameter('userId', i);
						const endpoint = `/admin/users/delete/${userId}`;
						responseData = await mispApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//                user: get
						// ----------------------------------------

						const userId = this.getNodeParameter('userId', i);
						const endpoint = `/admin/users/view/${userId}`;
						responseData = await mispApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.User;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               user: getAll
						// ----------------------------------------

						responseData = (await mispApiRequestAllItems.call(this, '/admin/users')) as Array<{
							User: unknown;
						}>;
						responseData = responseData.map((entry) => entry.User);
					} else if (operation === 'update') {
						// ----------------------------------------
						//               user: update
						// ----------------------------------------

						const body = {};
						const updateFields = this.getNodeParameter('updateFields', i);
						throwOnEmptyUpdate.call(this, resource, updateFields);
						Object.assign(body, updateFields);

						const userId = this.getNodeParameter('userId', i);
						const endpoint = `/admin/users/edit/${userId}`;
						responseData = await mispApiRequest.call(this, 'PUT', endpoint, body);
						responseData = responseData.User;
					}
				} else if (resource === 'warninglist') {
					// **********************************************************************
					//                              warninglist
					// **********************************************************************

					if (operation === 'get') {
						// ----------------------------------------
						//             warninglist: get
						// ----------------------------------------

						const warninglistId = this.getNodeParameter('warninglistId', i);
						const endpoint = `/warninglists/view/${warninglistId}`;
						responseData = await mispApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.Warninglist;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//           warninglist: getAll
						// ----------------------------------------

						responseData = (await mispApiRequest.call(this, 'GET', '/warninglists')) as {
							Warninglists: Array<{ Warninglist: unknown }>;
						};

						const returnAll = this.getNodeParameter('returnAll', 0);

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', 0);
							responseData = responseData.Warninglists.slice(0, limit).map(
								(entry) => entry.Warninglist,
							);
						} else {
							responseData = responseData.Warninglists.map((entry) => entry.Warninglist);
						}
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}

		return this.prepareOutputData(returnData);
	}
}
