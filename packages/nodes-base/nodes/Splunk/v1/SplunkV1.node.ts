import set from 'lodash/set';
import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	firedAlertOperations,
	searchConfigurationFields,
	searchConfigurationOperations,
	searchJobFields,
	searchJobOperations,
	searchResultFields,
	searchResultOperations,
	userFields,
	userOperations,
} from './descriptions';
import {
	formatFeed,
	formatResults,
	formatSearch,
	getId,
	populate,
	setCount,
	splunkApiRequest,
	toUnixEpoch,
} from './GenericFunctions';
import type { SplunkFeedResponse } from './types';
import { oldVersionNotice } from '../../../utils/descriptions';

const versionDescription: INodeTypeDescription = {
	displayName: 'Splunk',
	name: 'splunk',
	icon: 'file:splunk.svg',
	group: ['transform'],
	version: 1,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume the Splunk Enterprise API',
	defaults: {
		name: 'Splunk',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'splunkApi',
			required: true,
		},
	],
	properties: [
		oldVersionNotice,
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Fired Alert',
					value: 'firedAlert',
				},
				{
					name: 'Search Configuration',
					value: 'searchConfiguration',
				},
				{
					name: 'Search Job',
					value: 'searchJob',
				},
				{
					name: 'Search Result',
					value: 'searchResult',
				},
				{
					name: 'User',
					value: 'user',
				},
			],
			default: 'searchJob',
		},
		...firedAlertOperations,
		...searchConfigurationOperations,
		...searchConfigurationFields,
		...searchJobOperations,
		...searchJobFields,
		...searchResultOperations,
		...searchResultFields,
		...userOperations,
		...userFields,
	],
};

export class SplunkV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		loadOptions: {
			async getRoles(this: ILoadOptionsFunctions) {
				const endpoint = '/services/authorization/roles';
				const responseData = (await splunkApiRequest.call(
					this,
					'GET',
					endpoint,
				)) as SplunkFeedResponse;
				const { entry: entries } = responseData.feed;

				return Array.isArray(entries)
					? entries.map((entry) => ({ name: entry.title, value: entry.title }))
					: [{ name: entries.title, value: entries.title }];
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
				if (resource === 'firedAlert') {
					// **********************************************************************
					//                               firedAlert
					// **********************************************************************

					if (operation === 'getReport') {
						// ----------------------------------------
						//            firedAlert: getReport
						// ----------------------------------------

						// https://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTsearch#alerts.2Ffired_alerts

						const endpoint = '/services/alerts/fired_alerts';
						responseData = await splunkApiRequest.call(this, 'GET', endpoint).then(formatFeed);
					}
				} else if (resource === 'searchConfiguration') {
					// **********************************************************************
					//                          searchConfiguration
					// **********************************************************************

					if (operation === 'delete') {
						// ----------------------------------------
						//       searchConfiguration: delete
						// ----------------------------------------

						// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#saved.2Fsearches.2F.7Bname.7D

						const partialEndpoint = '/services/saved/searches/';
						const searchConfigurationId = getId.call(
							this,
							i,
							'searchConfigurationId',
							'/search/saved/searches/',
						); // id endpoint differs from operation endpoint
						const endpoint = `${partialEndpoint}/${searchConfigurationId}`;

						responseData = await splunkApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//         searchConfiguration: get
						// ----------------------------------------

						// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#saved.2Fsearches.2F.7Bname.7D

						const partialEndpoint = '/services/saved/searches/';
						const searchConfigurationId = getId.call(
							this,
							i,
							'searchConfigurationId',
							'/search/saved/searches/',
						); // id endpoint differs from operation endpoint
						const endpoint = `${partialEndpoint}/${searchConfigurationId}`;

						responseData = await splunkApiRequest.call(this, 'GET', endpoint).then(formatFeed);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//       searchConfiguration: getAll
						// ----------------------------------------

						// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#saved.2Fsearches

						const qs = {} as IDataObject;
						const options = this.getNodeParameter('options', i);

						populate(options, qs);
						setCount.call(this, qs);

						const endpoint = '/services/saved/searches';
						responseData = await splunkApiRequest
							.call(this, 'GET', endpoint, {}, qs)
							.then(formatFeed);
					}
				} else if (resource === 'searchJob') {
					// **********************************************************************
					//                               searchJob
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//            searchJob: create
						// ----------------------------------------

						// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#search.2Fjobs

						const body = {
							search: this.getNodeParameter('search', i),
						} as IDataObject;

						const { earliest_time, latest_time, index_earliest, index_latest, ...rest } =
							this.getNodeParameter('additionalFields', i) as IDataObject & {
								earliest_time?: string;
								latest_time?: string;
								index_earliest?: string;
								index_latest?: string;
							};

						populate(
							{
								...(earliest_time && { earliest_time: toUnixEpoch(earliest_time) }),
								...(latest_time && { latest_time: toUnixEpoch(latest_time) }),
								...(index_earliest && { index_earliest: toUnixEpoch(index_earliest) }),
								...(index_latest && { index_latest: toUnixEpoch(index_latest) }),
								...rest,
							},
							body,
						);

						const endpoint = '/services/search/jobs';
						responseData = await splunkApiRequest.call(this, 'POST', endpoint, body);

						const getEndpoint = `/services/search/jobs/${responseData.response.sid}`;
						responseData = await splunkApiRequest.call(this, 'GET', getEndpoint).then(formatSearch);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//            searchJob: delete
						// ----------------------------------------

						// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#search.2Fjobs.2F.7Bsearch_id.7D

						const partialEndpoint = '/services/search/jobs/';
						const searchJobId = getId.call(this, i, 'searchJobId', partialEndpoint);
						const endpoint = `${partialEndpoint}/${searchJobId}`;
						responseData = await splunkApiRequest.call(this, 'DELETE', endpoint);
					} else if (operation === 'get') {
						// ----------------------------------------
						//              searchJob: get
						// ----------------------------------------

						// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#search.2Fjobs.2F.7Bsearch_id.7D

						const partialEndpoint = '/services/search/jobs/';
						const searchJobId = getId.call(this, i, 'searchJobId', partialEndpoint);
						const endpoint = `${partialEndpoint}/${searchJobId}`;
						responseData = await splunkApiRequest.call(this, 'GET', endpoint).then(formatSearch);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//            searchJob: getAll
						// ----------------------------------------

						// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTsearch#search.2Fjobs

						const qs = {} as IDataObject;
						const options = this.getNodeParameter('options', i);

						populate(options, qs);
						setCount.call(this, qs);

						const endpoint = '/services/search/jobs';
						responseData = (await splunkApiRequest.call(
							this,
							'GET',
							endpoint,
							{},
							qs,
						)) as SplunkFeedResponse;
						responseData = formatFeed(responseData);
					}
				} else if (resource === 'searchResult') {
					// **********************************************************************
					//                              searchResult
					// **********************************************************************

					if (operation === 'getAll') {
						// ----------------------------------------
						//           searchResult: getAll
						// ----------------------------------------

						// https://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTsearch#search.2Fjobs.2F.7Bsearch_id.7D.2Fresults

						const searchJobId = this.getNodeParameter('searchJobId', i);

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject & {
							keyValueMatch?: { keyValuePair?: { key: string; value: string } };
						};
						const options = this.getNodeParameter('options', i);

						const keyValuePair = filters?.keyValueMatch?.keyValuePair;

						if (keyValuePair?.key && keyValuePair?.value) {
							qs.search = `search ${keyValuePair.key}=${keyValuePair.value}`;
						}

						populate(options, qs);
						setCount.call(this, qs);

						const endpoint = `/services/search/jobs/${searchJobId}/results`;
						responseData = await splunkApiRequest
							.call(this, 'GET', endpoint, {}, qs)
							.then(formatResults);
					}
				} else if (resource === 'user') {
					// **********************************************************************
					//                                  user
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------------
						//               user: create
						// ----------------------------------------

						// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTaccess#authentication.2Fusers

						const roles = this.getNodeParameter('roles', i) as string[];

						const body = {
							name: this.getNodeParameter('name', i),
							roles,
							password: this.getNodeParameter('password', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						populate(additionalFields, body);

						const endpoint = '/services/authentication/users';
						responseData = (await splunkApiRequest.call(
							this,
							'POST',
							endpoint,
							body,
						)) as SplunkFeedResponse;
						responseData = formatFeed(responseData);
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               user: delete
						// ----------------------------------------

						// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTaccess#authentication.2Fusers.2F.7Bname.7D

						const partialEndpoint = '/services/authentication/users';
						const userId = getId.call(this, i, 'userId', partialEndpoint);
						const endpoint = `${partialEndpoint}/${userId}`;
						await splunkApiRequest.call(this, 'DELETE', endpoint);
						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------------
						//                user: get
						// ----------------------------------------

						// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTaccess#authentication.2Fusers.2F.7Bname.7D

						const partialEndpoint = '/services/authentication/users/';
						const userId = getId.call(this, i, 'userId', '/services/authentication/users/');
						const endpoint = `${partialEndpoint}/${userId}`;
						responseData = await splunkApiRequest.call(this, 'GET', endpoint).then(formatFeed);
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               user: getAll
						// ----------------------------------------

						// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTaccess#authentication.2Fusers

						const qs = {} as IDataObject;
						setCount.call(this, qs);

						const endpoint = '/services/authentication/users';
						responseData = await splunkApiRequest
							.call(this, 'GET', endpoint, {}, qs)
							.then(formatFeed);
					} else if (operation === 'update') {
						// ----------------------------------------
						//               user: update
						// ----------------------------------------

						// https://docs.splunk.com/Documentation/Splunk/8.2.2/RESTREF/RESTaccess#authentication.2Fusers.2F.7Bname.7D

						const body = {} as IDataObject;
						const { roles, ...rest } = this.getNodeParameter('updateFields', i) as IDataObject & {
							roles: string[];
						};

						populate(
							{
								...(roles && { roles }),
								...rest,
							},
							body,
						);

						const partialEndpoint = '/services/authentication/users/';
						const userId = getId.call(this, i, 'userId', partialEndpoint);
						const endpoint = `${partialEndpoint}/${userId}`;
						responseData = await splunkApiRequest
							.call(this, 'POST', endpoint, body)
							.then(formatFeed);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.cause.error }, pairedItem: { item: i } });
					continue;
				}

				if (error instanceof NodeApiError) {
					set(error, 'context.itemIndex', i);
				}

				if (error instanceof NodeOperationError && error?.context?.itemIndex === undefined) {
					set(error, 'context.itemIndex', i);
				}

				throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
			}

			if (Array.isArray(responseData)) {
				for (const item of responseData) {
					returnData.push({ json: item, pairedItem: { item: i } });
				}
			} else {
				returnData.push({ json: responseData, pairedItem: { item: i } });
			}
		}

		return [returnData];
	}
}
