/* eslint-disable @typescript-eslint/dot-notation */
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
} from 'n8n-workflow';

import {
	And,
	Between,
	ContainsString,
	Eq,
	Id,
	In,
	Parent,
	buildCustomFieldSearch,
	prepareOptional,
	prepareRangeQuery,
	prepareSortQuery,
	splitTags,
} from '../helpers/utils';

import { prepareCustomFields, theHiveApiRequest } from '../transport';

import set from 'lodash/set';
import type { BodyWithQuery, IQueryObject } from '../helpers/interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;
	const qs: IDataObject = {};
	let responseData;
	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	for (let i = 0; i < length; i++) {
		try {
			if (resource === 'alert') {
				if (operation === 'count') {
					const filters = this.getNodeParameter('filters', i, {}) as INodeParameters;
					const countQueryAttributs = prepareOptional(filters);

					const _countSearchQuery: IQueryObject = And();

					if ('customFieldsUi' in filters) {
						const customFields = (await prepareCustomFields.call(this, filters)) as IDataObject;
						const searchQueries = buildCustomFieldSearch(customFields);
						(_countSearchQuery['_and'] as IQueryObject[]).push(...searchQueries);
					}

					for (const key of Object.keys(countQueryAttributs)) {
						if (key === 'tags') {
							(_countSearchQuery['_and'] as IQueryObject[]).push(
								In(key, countQueryAttributs[key] as string[]),
							);
						} else if (key === 'description' || key === 'title') {
							(_countSearchQuery['_and'] as IQueryObject[]).push(
								ContainsString(key, countQueryAttributs[key] as string),
							);
						} else {
							(_countSearchQuery['_and'] as IQueryObject[]).push(
								Eq(key, countQueryAttributs[key] as string),
							);
						}
					}

					const body = {
						query: [
							{
								_name: 'listAlert',
							},
							{
								_name: 'filter',
								_and: _countSearchQuery['_and'],
							},
						],
					};

					body['query'].push({
						_name: 'count',
					});

					qs.name = 'count-Alert';

					responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

					responseData = { count: responseData };
				}

				if (operation === 'create') {
					const additionalFields = this.getNodeParameter('additionalFields', i) as INodeParameters;
					const jsonParameters = this.getNodeParameter('jsonParameters', i);

					const customFields = await prepareCustomFields.call(
						this,
						additionalFields,
						jsonParameters,
					);
					const body: IDataObject = {
						title: this.getNodeParameter('title', i),
						description: this.getNodeParameter('description', i),
						severity: this.getNodeParameter('severity', i),
						date: Date.parse(this.getNodeParameter('date', i) as string),
						tags: splitTags(this.getNodeParameter('tags', i) as string),
						tlp: this.getNodeParameter('tlp', i),
						status: this.getNodeParameter('status', i),
						type: this.getNodeParameter('type', i),
						source: this.getNodeParameter('source', i),
						sourceRef: this.getNodeParameter('sourceRef', i),
						follow: this.getNodeParameter('follow', i, true),
						...prepareOptional(additionalFields),
					};

					if (customFields) {
						Object.keys(customFields).forEach((key) => {
							set(body, key, customFields[key]);
						});
					}

					const artifactUi = this.getNodeParameter('artifactUi', i) as IDataObject;

					if (artifactUi) {
						const artifactValues = artifactUi.artifactValues as IDataObject[];

						if (artifactValues) {
							const artifactData = [];

							for (const artifactvalue of artifactValues) {
								const element: IDataObject = {};

								element.message = artifactvalue.message as string;

								element.tags = (artifactvalue.tags as string).split(',');

								element.dataType = artifactvalue.dataType as string;

								element.data = artifactvalue.data as string;

								if (artifactvalue.dataType === 'file') {
									const binaryPropertyName = artifactvalue.binaryProperty as string;
									const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
									element.data = `${binaryData.fileName};${binaryData.mimeType};${binaryData.data}`;
								}

								artifactData.push(element);
							}
							body.artifacts = artifactData;
						}
					}

					responseData = await theHiveApiRequest.call(this, 'POST', '/alert' as string, body);
				}

				/*
					Execute responder feature differs from Cortex execute responder
					if it doesn't interfere with n8n standards then we should keep it
				*/

				if (operation === 'executeResponder') {
					const alertId = this.getNodeParameter('id', i);
					const responderId = this.getNodeParameter('responder', i) as string;
					let body: IDataObject;
					let response;
					responseData = [];
					body = {
						responderId,
						objectId: alertId,
						objectType: 'alert',
					};
					response = await theHiveApiRequest.call(
						this,
						'POST',
						'/connector/cortex/action' as string,
						body,
					);
					body = {
						query: [
							{
								_name: 'listAction',
							},
							{
								_name: 'filter',
								_and: [
									{
										_field: 'cortexId',
										_value: response.cortexId,
									},
									{
										_field: 'objectId',
										_value: response.objectId,
									},
									{
										_field: 'startDate',
										_value: response.startDate,
									},
								],
							},
						],
					};
					qs.name = 'log-actions';
					do {
						response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
					} while (response.status === 'Waiting' || response.status === 'InProgress');

					responseData = response;
				}

				if (operation === 'get') {
					const alertId = this.getNodeParameter('id', i) as string;
					const includeSimilar = this.getNodeParameter(
						'options.includeSimilar',
						i,
						false,
					) as boolean;

					if (includeSimilar) {
						qs.similarity = true;
					}

					responseData = await theHiveApiRequest.call(this, 'GET', `/alert/${alertId}`, {}, qs);
				}
				if (operation === 'getAll') {
					const credentials = await this.getCredentials('theHiveApi');

					const returnAll = this.getNodeParameter('returnAll', i);

					const version = credentials.apiVersion;

					const filters = this.getNodeParameter('filters', i, {}) as INodeParameters;
					const queryAttributs = prepareOptional(filters);
					const options = this.getNodeParameter('options', i);

					const _searchQuery: IQueryObject = And();

					if ('customFieldsUi' in filters) {
						const customFields = (await prepareCustomFields.call(this, filters)) as IDataObject;
						const searchQueries = buildCustomFieldSearch(customFields);
						(_searchQuery['_and'] as IQueryObject[]).push(...searchQueries);
					}

					for (const key of Object.keys(queryAttributs)) {
						if (key === 'tags') {
							(_searchQuery['_and'] as IQueryObject[]).push(
								In(key, queryAttributs[key] as string[]),
							);
						} else if (key === 'description' || key === 'title') {
							(_searchQuery['_and'] as IQueryObject[]).push(
								ContainsString(key, queryAttributs[key] as string),
							);
						} else {
							(_searchQuery['_and'] as IQueryObject[]).push(Eq(key, queryAttributs[key] as string));
						}
					}

					let endpoint;

					let method;

					let body: IDataObject = {};

					let limit = undefined;

					if (!returnAll) {
						limit = this.getNodeParameter('limit', i);
					}

					if (version === 'v1') {
						endpoint = '/v1/query';

						method = 'POST';

						body = {
							query: [
								{
									_name: 'listAlert',
								},
								{
									_name: 'filter',
									_and: _searchQuery['_and'],
								},
							],
						};

						prepareSortQuery(options.sort as string, body as BodyWithQuery);

						if (limit !== undefined) {
							prepareRangeQuery(`0-${limit}`, body as BodyWithQuery);
						}

						qs.name = 'alerts';
					} else {
						method = 'POST';

						endpoint = '/alert/_search';

						if (limit !== undefined) {
							qs.range = `0-${limit}`;
						}

						body.query = _searchQuery;

						Object.assign(qs, prepareOptional(options));
					}

					responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
				}

				if (operation === 'markAsRead') {
					const alertId = this.getNodeParameter('id', i) as string;

					responseData = await theHiveApiRequest.call(this, 'POST', `/alert/${alertId}/markAsRead`);
				}

				if (operation === 'markAsUnread') {
					const alertId = this.getNodeParameter('id', i) as string;

					responseData = await theHiveApiRequest.call(
						this,
						'POST',
						`/alert/${alertId}/markAsUnread`,
					);
				}

				if (operation === 'merge') {
					const alertId = this.getNodeParameter('id', i) as string;

					const caseId = this.getNodeParameter('caseId', i) as string;

					responseData = await theHiveApiRequest.call(
						this,
						'POST',
						`/alert/${alertId}/merge/${caseId}`,
						{},
					);
				}

				if (operation === 'promote') {
					const alertId = this.getNodeParameter('id', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i);

					const body: IDataObject = {};

					Object.assign(body, additionalFields);

					responseData = await theHiveApiRequest.call(
						this,
						'POST',
						`/alert/${alertId}/createCase`,
						body,
					);
				}

				if (operation === 'update') {
					const alertId = this.getNodeParameter('id', i) as string;
					const jsonParameters = this.getNodeParameter('jsonParameters', i);

					const updateFields = this.getNodeParameter('updateFields', i);
					const customFields = await prepareCustomFields.call(this, updateFields, jsonParameters);

					const artifactUi = updateFields.artifactUi as IDataObject;

					delete updateFields.artifactUi;

					const body: IDataObject = {
						...customFields,
					};

					Object.assign(body, updateFields);

					if (artifactUi) {
						const artifactValues = artifactUi.artifactValues as IDataObject[];

						if (artifactValues) {
							const artifactData = [];

							for (const artifactvalue of artifactValues) {
								const element: IDataObject = {};

								element.message = artifactvalue.message as string;

								element.tags = (artifactvalue.tags as string).split(',');

								element.dataType = artifactvalue.dataType as string;

								element.data = artifactvalue.data as string;

								if (artifactvalue.dataType === 'file') {
									const binaryPropertyName = artifactvalue.binaryProperty as string;
									const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
									element.data = `${binaryData.fileName};${binaryData.mimeType};${binaryData.data}`;
								}

								artifactData.push(element);
							}
							body.artifacts = artifactData;
						}
					}

					responseData = await theHiveApiRequest.call(this, 'PATCH', `/alert/${alertId}`, body);
				}
			}

			if (resource === 'observable') {
				if (operation === 'count') {
					const countQueryAttributs = prepareOptional(
						this.getNodeParameter('filters', i, {}) as INodeParameters,
					);
					const _countSearchQuery: IQueryObject = And();

					for (const key of Object.keys(countQueryAttributs)) {
						if (key === 'dataType' || key === 'tags') {
							(_countSearchQuery['_and'] as IQueryObject[]).push(
								In(key, countQueryAttributs[key] as string[]),
							);
						} else if (key === 'description' || key === 'keywork' || key === 'message') {
							(_countSearchQuery['_and'] as IQueryObject[]).push(
								ContainsString(key, countQueryAttributs[key] as string),
							);
						} else if (key === 'range') {
							(_countSearchQuery['_and'] as IQueryObject[]).push(
								Between(
									'startDate',
									((countQueryAttributs['range'] as IDataObject)['dateRange'] as IDataObject)[
										'fromDate'
									],
									((countQueryAttributs['range'] as IDataObject)['dateRange'] as IDataObject)[
										'toDate'
									],
								),
							);
						} else {
							(_countSearchQuery['_and'] as IQueryObject[]).push(
								Eq(key, countQueryAttributs[key] as string),
							);
						}
					}

					const body = {
						query: [
							{
								_name: 'listObservable',
							},
							{
								_name: 'filter',
								_and: _countSearchQuery['_and'],
							},
						],
					};

					body['query'].push({
						_name: 'count',
					});

					qs.name = 'count-observables';

					responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

					responseData = { count: responseData };
				}

				if (operation === 'executeAnalyzer') {
					const observableId = this.getNodeParameter('id', i);
					const analyzers = (this.getNodeParameter('analyzers', i) as string[]).map((analyzer) => {
						const parts = analyzer.split('::');
						return {
							analyzerId: parts[0],
							cortexId: parts[1],
						};
					});
					let response: any;
					let body: IDataObject;
					responseData = [];
					for (const analyzer of analyzers) {
						body = {
							...analyzer,
							artifactId: observableId,
						};
						// execute the analyzer
						response = await theHiveApiRequest.call(
							this,
							'POST',
							'/connector/cortex/job' as string,
							body,
							qs,
						);
						const jobId = response.id;
						qs.name = 'observable-jobs';
						// query the job result (including the report)
						do {
							responseData = await theHiveApiRequest.call(
								this,
								'GET',
								`/connector/cortex/job/${jobId}`,
								body,
								qs,
							);
						} while (responseData.status === 'Waiting' || responseData.status === 'InProgress');
					}
				}

				if (operation === 'executeResponder') {
					const observableId = this.getNodeParameter('id', i);
					const responderId = this.getNodeParameter('responder', i) as string;
					let body: IDataObject;
					let response;
					responseData = [];
					body = {
						responderId,
						objectId: observableId,
						objectType: 'case_artifact',
					};
					response = await theHiveApiRequest.call(
						this,
						'POST',
						'/connector/cortex/action' as string,
						body,
					);
					body = {
						query: [
							{
								_name: 'listAction',
							},
							{
								_name: 'filter',
								_and: [
									{
										_field: 'cortexId',
										_value: response.cortexId,
									},
									{
										_field: 'objectId',
										_value: response.objectId,
									},
									{
										_field: 'startDate',
										_value: response.startDate,
									},
								],
							},
						],
					};
					qs.name = 'log-actions';
					do {
						response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
					} while (response.status === 'Waiting' || response.status === 'InProgress');

					responseData = response;
				}

				if (operation === 'create') {
					const caseId = this.getNodeParameter('caseId', i);

					let body: IDataObject = {
						dataType: this.getNodeParameter('dataType', i) as string,
						message: this.getNodeParameter('message', i) as string,
						startDate: Date.parse(this.getNodeParameter('startDate', i) as string),
						tlp: this.getNodeParameter('tlp', i) as number,
						ioc: this.getNodeParameter('ioc', i) as boolean,
						sighted: this.getNodeParameter('sighted', i) as boolean,
						status: this.getNodeParameter('status', i) as string,
						...prepareOptional(this.getNodeParameter('options', i, {}) as INodeParameters),
					};

					let options: IDataObject = {};

					if (body.dataType === 'file') {
						const binaryPropertyName = this.getNodeParameter('binaryProperty', i);
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						options = {
							formData: {
								attachment: {
									value: dataBuffer,
									options: {
										contentType: binaryData.mimeType,
										filename: binaryData.fileName,
									},
								},
								_json: JSON.stringify(body),
							},
						};
						body = {};
					} else {
						body.data = this.getNodeParameter('data', i) as string;
					}

					responseData = await theHiveApiRequest.call(
						this,
						'POST',
						`/case/${caseId}/artifact`,
						body,
						qs,
						'',
						options,
					);
				}

				if (operation === 'get') {
					const observableId = this.getNodeParameter('id', i) as string;

					const credentials = await this.getCredentials('theHiveApi');

					const version = credentials.apiVersion;

					let endpoint;

					let method;

					let body: IDataObject = {};

					if (version === 'v1') {
						endpoint = '/v1/query';

						method = 'POST';

						body = {
							query: [
								{
									_name: 'getObservable',
									idOrName: observableId,
								},
							],
						};

						qs.name = `get-observable-${observableId}`;
					} else {
						method = 'GET';

						endpoint = `/case/artifact/${observableId}`;
					}

					responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
				}

				if (operation === 'getAll') {
					const credentials = await this.getCredentials('theHiveApi');

					const returnAll = this.getNodeParameter('returnAll', i);

					const version = credentials.apiVersion;

					const options = this.getNodeParameter('options', i);

					const caseId = this.getNodeParameter('caseId', i);

					let endpoint;

					let method;

					let body: IDataObject = {};

					let limit = undefined;

					if (!returnAll) {
						limit = this.getNodeParameter('limit', i);
					}

					if (version === 'v1') {
						endpoint = '/v1/query';

						method = 'POST';

						body = {
							query: [
								{
									_name: 'getCase',
									idOrName: caseId,
								},
								{
									_name: 'observables',
								},
							],
						};

						prepareSortQuery(options.sort as string, body as BodyWithQuery);

						if (limit !== undefined) {
							prepareRangeQuery(`0-${limit}`, body as BodyWithQuery);
						}

						qs.name = 'observables';
					} else {
						method = 'POST';

						endpoint = '/case/artifact/_search';

						if (limit !== undefined) {
							qs.range = `0-${limit}`;
						}

						body.query = Parent('case', Id(caseId as string));

						Object.assign(qs, prepareOptional(options));
					}

					responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
				}

				if (operation === 'search') {
					const credentials = await this.getCredentials('theHiveApi');

					const returnAll = this.getNodeParameter('returnAll', i);

					const version = credentials.apiVersion;

					const queryAttributs = prepareOptional(
						this.getNodeParameter('filters', i, {}) as INodeParameters,
					);

					const _searchQuery: IQueryObject = And();

					const options = this.getNodeParameter('options', i);

					for (const key of Object.keys(queryAttributs)) {
						if (key === 'dataType' || key === 'tags') {
							(_searchQuery['_and'] as IQueryObject[]).push(
								In(key, queryAttributs[key] as string[]),
							);
						} else if (key === 'description' || key === 'keywork' || key === 'message') {
							(_searchQuery['_and'] as IQueryObject[]).push(
								ContainsString(key, queryAttributs[key] as string),
							);
						} else if (key === 'range') {
							(_searchQuery['_and'] as IQueryObject[]).push(
								Between(
									'startDate',
									((queryAttributs['range'] as IDataObject)['dateRange'] as IDataObject)[
										'fromDate'
									],
									((queryAttributs['range'] as IDataObject)['dateRange'] as IDataObject)['toDate'],
								),
							);
						} else {
							(_searchQuery['_and'] as IQueryObject[]).push(Eq(key, queryAttributs[key] as string));
						}
					}

					let endpoint;

					let method;

					let body: IDataObject = {};

					let limit = undefined;

					if (!returnAll) {
						limit = this.getNodeParameter('limit', i);
					}

					if (version === 'v1') {
						endpoint = '/v1/query';

						method = 'POST';

						body = {
							query: [
								{
									_name: 'listObservable',
								},
								{
									_name: 'filter',
									_and: _searchQuery['_and'],
								},
							],
						};

						prepareSortQuery(options.sort as string, body as BodyWithQuery);

						if (limit !== undefined) {
							prepareRangeQuery(`0-${limit}`, body as BodyWithQuery);
						}

						qs.name = 'observables';
					} else {
						method = 'POST';

						endpoint = '/case/artifact/_search';

						if (limit !== undefined) {
							qs.range = `0-${limit}`;
						}

						body.query = _searchQuery;

						Object.assign(qs, prepareOptional(options));
					}

					responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
				}

				if (operation === 'update') {
					const id = this.getNodeParameter('id', i) as string;

					const body: IDataObject = {
						...prepareOptional(this.getNodeParameter('updateFields', i, {}) as INodeParameters),
					};

					responseData = await theHiveApiRequest.call(
						this,
						'PATCH',
						`/case/artifact/${id}`,
						body,
						qs,
					);

					responseData = { success: true };
				}
			}

			if (resource === 'case') {
				if (operation === 'count') {
					const filters = this.getNodeParameter('filters', i, {}) as INodeParameters;
					const countQueryAttributs = prepareOptional(filters);

					const _countSearchQuery: IQueryObject = And();

					if ('customFieldsUi' in filters) {
						const customFields = (await prepareCustomFields.call(this, filters)) as IDataObject;
						const searchQueries = buildCustomFieldSearch(customFields);
						(_countSearchQuery['_and'] as IQueryObject[]).push(...searchQueries);
					}

					for (const key of Object.keys(countQueryAttributs)) {
						if (key === 'tags') {
							(_countSearchQuery['_and'] as IQueryObject[]).push(
								In(key, countQueryAttributs[key] as string[]),
							);
						} else if (key === 'description' || key === 'summary' || key === 'title') {
							(_countSearchQuery['_and'] as IQueryObject[]).push(
								ContainsString(key, countQueryAttributs[key] as string),
							);
						} else {
							(_countSearchQuery['_and'] as IQueryObject[]).push(
								Eq(key, countQueryAttributs[key] as string),
							);
						}
					}

					const body = {
						query: [
							{
								_name: 'listCase',
							},
							{
								_name: 'filter',
								_and: _countSearchQuery['_and'],
							},
						],
					};

					body['query'].push({
						_name: 'count',
					});

					qs.name = 'count-cases';

					responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

					responseData = { count: responseData };
				}

				if (operation === 'executeResponder') {
					const caseId = this.getNodeParameter('id', i);
					const responderId = this.getNodeParameter('responder', i) as string;
					let body: IDataObject;
					let response;
					responseData = [];
					body = {
						responderId,
						objectId: caseId,
						objectType: 'case',
					};
					response = await theHiveApiRequest.call(
						this,
						'POST',
						'/connector/cortex/action' as string,
						body,
					);
					body = {
						query: [
							{
								_name: 'listAction',
							},
							{
								_name: 'filter',
								_and: [
									{
										_field: 'cortexId',
										_value: response.cortexId,
									},
									{
										_field: 'objectId',
										_value: response.objectId,
									},
									{
										_field: 'startDate',
										_value: response.startDate,
									},
								],
							},
						],
					};
					qs.name = 'log-actions';
					do {
						response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
					} while (response.status === 'Waiting' || response.status === 'InProgress');

					responseData = response;
				}

				if (operation === 'create') {
					const options = this.getNodeParameter('options', i, {}) as INodeParameters;
					const jsonParameters = this.getNodeParameter('jsonParameters', i);
					const customFields = await prepareCustomFields.call(this, options, jsonParameters);

					const body: IDataObject = {
						title: this.getNodeParameter('title', i),
						description: this.getNodeParameter('description', i),
						severity: this.getNodeParameter('severity', i),
						startDate: Date.parse(this.getNodeParameter('startDate', i) as string),
						owner: this.getNodeParameter('owner', i),
						flag: this.getNodeParameter('flag', i),
						tlp: this.getNodeParameter('tlp', i),
						tags: splitTags(this.getNodeParameter('tags', i) as string),
						...prepareOptional(options),
					};

					if (customFields) {
						Object.keys(customFields).forEach((key) => {
							set(body, key, customFields[key]);
						});
					}

					responseData = await theHiveApiRequest.call(this, 'POST', '/case' as string, body);
				}

				if (operation === 'get') {
					const caseId = this.getNodeParameter('id', i) as string;

					const credentials = await this.getCredentials('theHiveApi');

					const version = credentials.apiVersion;

					let endpoint;

					let method;

					let body: IDataObject = {};

					if (version === 'v1') {
						endpoint = '/v1/query';

						method = 'POST';

						body = {
							query: [
								{
									_name: 'getCase',
									idOrName: caseId,
								},
							],
						};

						qs.name = `get-case-${caseId}`;
					} else {
						method = 'GET';

						endpoint = `/case/${caseId}`;
					}

					responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
				}

				if (operation === 'getAll') {
					const credentials = await this.getCredentials('theHiveApi');

					const returnAll = this.getNodeParameter('returnAll', i);

					const version = credentials.apiVersion;

					const filters = this.getNodeParameter('filters', i, {}) as INodeParameters;
					const queryAttributs = prepareOptional(filters);

					const _searchQuery: IQueryObject = And();

					const options = this.getNodeParameter('options', i);

					if ('customFieldsUi' in filters) {
						const customFields = (await prepareCustomFields.call(this, filters)) as IDataObject;
						const searchQueries = buildCustomFieldSearch(customFields);
						(_searchQuery['_and'] as IQueryObject[]).push(...searchQueries);
					}

					for (const key of Object.keys(queryAttributs)) {
						if (key === 'tags') {
							(_searchQuery['_and'] as IQueryObject[]).push(
								In(key, queryAttributs[key] as string[]),
							);
						} else if (key === 'description' || key === 'summary' || key === 'title') {
							(_searchQuery['_and'] as IQueryObject[]).push(
								ContainsString(key, queryAttributs[key] as string),
							);
						} else {
							(_searchQuery['_and'] as IQueryObject[]).push(Eq(key, queryAttributs[key] as string));
						}
					}

					let endpoint;

					let method;

					let body: IDataObject = {};

					let limit = undefined;

					if (!returnAll) {
						limit = this.getNodeParameter('limit', i);
					}

					if (version === 'v1') {
						endpoint = '/v1/query';

						method = 'POST';

						body = {
							query: [
								{
									_name: 'listCase',
								},
								{
									_name: 'filter',
									_and: _searchQuery['_and'],
								},
							],
						};

						prepareSortQuery(options.sort as string, body as BodyWithQuery);

						if (limit !== undefined) {
							prepareRangeQuery(`0-${limit}`, body as BodyWithQuery);
						}

						qs.name = 'cases';
					} else {
						method = 'POST';

						endpoint = '/case/_search';

						if (limit !== undefined) {
							qs.range = `0-${limit}`;
						}

						body.query = _searchQuery;

						Object.assign(qs, prepareOptional(options));
					}

					responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
				}

				if (operation === 'update') {
					const id = this.getNodeParameter('id', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i, {}) as INodeParameters;
					const jsonParameters = this.getNodeParameter('jsonParameters', i);

					const customFields = await prepareCustomFields.call(this, updateFields, jsonParameters);

					const body: IDataObject = {
						...customFields,
						...prepareOptional(updateFields),
					};

					responseData = await theHiveApiRequest.call(this, 'PATCH', `/case/${id}`, body);
				}
			}

			if (resource === 'task') {
				if (operation === 'count') {
					const countQueryAttributs = prepareOptional(
						this.getNodeParameter('filters', i, {}) as INodeParameters,
					);

					const _countSearchQuery: IQueryObject = And();

					for (const key of Object.keys(countQueryAttributs)) {
						if (key === 'title' || key === 'description') {
							(_countSearchQuery['_and'] as IQueryObject[]).push(
								ContainsString(key, countQueryAttributs[key] as string),
							);
						} else {
							(_countSearchQuery['_and'] as IQueryObject[]).push(
								Eq(key, countQueryAttributs[key] as string),
							);
						}
					}

					const body = {
						query: [
							{
								_name: 'listTask',
							},
							{
								_name: 'filter',
								_and: _countSearchQuery['_and'],
							},
						],
					};

					body['query'].push({
						_name: 'count',
					});

					qs.name = 'count-tasks';

					responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

					responseData = { count: responseData };
				}

				if (operation === 'create') {
					const caseId = this.getNodeParameter('caseId', i) as string;

					const body: IDataObject = {
						title: this.getNodeParameter('title', i) as string,
						status: this.getNodeParameter('status', i) as string,
						flag: this.getNodeParameter('flag', i),
						...prepareOptional(this.getNodeParameter('options', i, {}) as INodeParameters),
					};

					responseData = await theHiveApiRequest.call(this, 'POST', `/case/${caseId}/task`, body);
				}

				if (operation === 'executeResponder') {
					const taskId = this.getNodeParameter('id', i);
					const responderId = this.getNodeParameter('responder', i) as string;
					let body: IDataObject;
					let response;
					responseData = [];
					body = {
						responderId,
						objectId: taskId,
						objectType: 'case_task',
					};
					response = await theHiveApiRequest.call(
						this,
						'POST',
						'/connector/cortex/action' as string,
						body,
					);
					body = {
						query: [
							{
								_name: 'listAction',
							},
							{
								_name: 'filter',
								_and: [
									{
										_field: 'cortexId',
										_value: response.cortexId,
									},
									{
										_field: 'objectId',
										_value: response.objectId,
									},
									{
										_field: 'startDate',
										_value: response.startDate,
									},
								],
							},
						],
					};
					qs.name = 'task-actions';
					do {
						response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
					} while (response.status === 'Waiting' || response.status === 'InProgress');

					responseData = response;
				}

				if (operation === 'get') {
					const taskId = this.getNodeParameter('id', i) as string;

					const credentials = await this.getCredentials('theHiveApi');

					const version = credentials.apiVersion;

					let endpoint;

					let method;

					let body: IDataObject = {};

					if (version === 'v1') {
						endpoint = '/v1/query';

						method = 'POST';

						body = {
							query: [
								{
									_name: 'getTask',
									idOrName: taskId,
								},
							],
						};

						qs.name = `get-task-${taskId}`;
					} else {
						method = 'GET';

						endpoint = `/case/task/${taskId}`;
					}

					responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
				}

				if (operation === 'getAll') {
					// get all require a case id (it retursn all tasks for a specific case)
					const credentials = await this.getCredentials('theHiveApi');

					const returnAll = this.getNodeParameter('returnAll', i);

					const version = credentials.apiVersion;

					const caseId = this.getNodeParameter('caseId', i) as string;

					const options = this.getNodeParameter('options', i);

					let endpoint;

					let method;

					let body: IDataObject = {};

					let limit = undefined;

					if (!returnAll) {
						limit = this.getNodeParameter('limit', i);
					}

					if (version === 'v1') {
						endpoint = '/v1/query';

						method = 'POST';

						body = {
							query: [
								{
									_name: 'getCase',
									idOrName: caseId,
								},
								{
									_name: 'tasks',
								},
							],
						};

						prepareSortQuery(options.sort as string, body as BodyWithQuery);

						if (limit !== undefined) {
							prepareRangeQuery(`0-${limit}`, body as BodyWithQuery);
						}

						qs.name = 'case-tasks';
					} else {
						method = 'POST';

						endpoint = '/case/task/_search';

						if (limit !== undefined) {
							qs.range = `0-${limit}`;
						}

						body.query = And(Parent('case', Id(caseId)));

						Object.assign(qs, prepareOptional(options));
					}

					responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
				}

				if (operation === 'search') {
					const credentials = await this.getCredentials('theHiveApi');

					const returnAll = this.getNodeParameter('returnAll', i);

					const version = credentials.apiVersion;

					const queryAttributs = prepareOptional(
						this.getNodeParameter('filters', i, {}) as INodeParameters,
					);

					const _searchQuery: IQueryObject = And();

					const options = this.getNodeParameter('options', i);

					for (const key of Object.keys(queryAttributs)) {
						if (key === 'title' || key === 'description') {
							(_searchQuery['_and'] as IQueryObject[]).push(
								ContainsString(key, queryAttributs[key] as string),
							);
						} else {
							(_searchQuery['_and'] as IQueryObject[]).push(Eq(key, queryAttributs[key] as string));
						}
					}

					let endpoint;

					let method;

					let body: IDataObject = {};

					let limit = undefined;

					if (!returnAll) {
						limit = this.getNodeParameter('limit', i);
					}

					if (version === 'v1') {
						endpoint = '/v1/query';

						method = 'POST';

						body = {
							query: [
								{
									_name: 'listTask',
								},
								{
									_name: 'filter',
									_and: _searchQuery['_and'],
								},
							],
						};

						prepareSortQuery(options.sort as string, body as BodyWithQuery);

						if (limit !== undefined) {
							prepareRangeQuery(`0-${limit}`, body as BodyWithQuery);
						}

						qs.name = 'tasks';
					} else {
						method = 'POST';

						endpoint = '/case/task/_search';

						if (limit !== undefined) {
							qs.range = `0-${limit}`;
						}

						body.query = _searchQuery;

						Object.assign(qs, prepareOptional(options));
					}

					responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
				}

				if (operation === 'update') {
					const id = this.getNodeParameter('id', i) as string;

					const body: IDataObject = {
						...prepareOptional(this.getNodeParameter('updateFields', i, {}) as INodeParameters),
					};

					responseData = await theHiveApiRequest.call(this, 'PATCH', `/case/task/${id}`, body);
				}
			}

			if (resource === 'log') {
				if (operation === 'create') {
					const taskId = this.getNodeParameter('taskId', i) as string;

					let body: IDataObject = {
						message: this.getNodeParameter('message', i),
						startDate: Date.parse(this.getNodeParameter('startDate', i) as string),
						status: this.getNodeParameter('status', i),
					};
					const optionals = this.getNodeParameter('options', i);

					let options: IDataObject = {};

					if (optionals.attachementUi) {
						const attachmentValues = (optionals.attachementUi as IDataObject)
							.attachmentValues as IDataObject;

						if (attachmentValues) {
							const binaryPropertyName = attachmentValues.binaryProperty as string;
							const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
							const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

							options = {
								formData: {
									attachment: {
										value: dataBuffer,
										options: {
											contentType: binaryData.mimeType,
											filename: binaryData.fileName,
										},
									},
									_json: JSON.stringify(body),
								},
							};

							body = {};
						}
					}

					responseData = await theHiveApiRequest.call(
						this,
						'POST',
						`/case/task/${taskId}/log`,
						body,
						qs,
						'',
						options,
					);
				}

				if (operation === 'executeResponder') {
					const logId = this.getNodeParameter('id', i);
					const responderId = this.getNodeParameter('responder', i) as string;
					let body: IDataObject;
					let response;
					responseData = [];
					body = {
						responderId,
						objectId: logId,
						objectType: 'case_task_log',
					};
					response = await theHiveApiRequest.call(
						this,
						'POST',
						'/connector/cortex/action' as string,
						body,
					);
					body = {
						query: [
							{
								_name: 'listAction',
							},
							{
								_name: 'filter',
								_and: [
									{
										_field: 'cortexId',
										_value: response.cortexId,
									},
									{
										_field: 'objectId',
										_value: response.objectId,
									},
									{
										_field: 'startDate',
										_value: response.startDate,
									},
								],
							},
						],
					};
					qs.name = 'log-actions';
					do {
						response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
					} while (response.status === 'Waiting' || response.status === 'InProgress');

					responseData = response;
				}

				if (operation === 'get') {
					const logId = this.getNodeParameter('id', i) as string;

					const credentials = await this.getCredentials('theHiveApi');

					const version = credentials.apiVersion;

					let endpoint;

					let method;

					let body: IDataObject = {};

					if (version === 'v1') {
						endpoint = '/v1/query';

						method = 'POST';

						body = {
							query: [
								{
									_name: 'getLog',
									idOrName: logId,
								},
							],
						};

						qs.name = `get-log-${logId}`;
					} else {
						method = 'POST';

						endpoint = '/case/task/log/_search';

						body.query = { _id: logId };
					}

					responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
				}

				if (operation === 'getAll') {
					const credentials = await this.getCredentials('theHiveApi');

					const returnAll = this.getNodeParameter('returnAll', i);

					const version = credentials.apiVersion;

					const taskId = this.getNodeParameter('taskId', i) as string;

					let endpoint;

					let method;

					let body: IDataObject = {};

					let limit = undefined;

					if (!returnAll) {
						limit = this.getNodeParameter('limit', i);
					}

					if (version === 'v1') {
						endpoint = '/v1/query';

						method = 'POST';

						body = {
							query: [
								{
									_name: 'getTask',
									idOrName: taskId,
								},
								{
									_name: 'logs',
								},
							],
						};

						if (limit !== undefined) {
							prepareRangeQuery(`0-${limit}`, body as BodyWithQuery);
						}

						qs.name = 'case-task-logs';
					} else {
						method = 'POST';

						endpoint = '/case/task/log/_search';

						if (limit !== undefined) {
							qs.range = `0-${limit}`;
						}

						body.query = And(Parent('task', Id(taskId)));
					}

					responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
				}
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
				continue;
			}
			throw error;
		}
	}
	return this.prepareOutputData(returnData);
}
