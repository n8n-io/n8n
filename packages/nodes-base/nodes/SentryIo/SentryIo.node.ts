import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { eventFields, eventOperations } from './EventDescription';

import { issueFields, issueOperations } from './IssueDescription';

import { organizationFields, organizationOperations } from './OrganizationDescription';

import { projectFields, projectOperations } from './ProjectDescription';

import { releaseFields, releaseOperations } from './ReleaseDescription';

import { teamFields, teamOperations } from './TeamDescription';

import { sentryApiRequestAllItems, sentryIoApiRequest } from './GenericFunctions';

import { ICommit, IPatchSet, IRef } from './Interface';

export class SentryIo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sentry.io',
		name: 'sentryIo',
		icon: 'file:sentryio.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Sentry.io API',
		defaults: {
			name: 'Sentry.io',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sentryIoOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
						sentryVersion: ['cloud'],
					},
				},
			},
			{
				name: 'sentryIoApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
						sentryVersion: ['cloud'],
					},
				},
			},
			{
				name: 'sentryIoServerApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
						sentryVersion: ['server'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Sentry Version',
				name: 'sentryVersion',
				type: 'options',
				options: [
					{
						name: 'Cloud',
						value: 'cloud',
					},
					{
						name: 'Server (Self Hosted)',
						value: 'server',
					},
				],
				default: 'cloud',
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				displayOptions: {
					show: {
						sentryVersion: ['cloud'],
					},
				},
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
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				displayOptions: {
					show: {
						sentryVersion: ['server'],
					},
				},
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
				],
				default: 'accessToken',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Event',
						value: 'event',
					},
					{
						name: 'Issue',
						value: 'issue',
					},
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Project',
						value: 'project',
					},
					{
						name: 'Release',
						value: 'release',
					},
					{
						name: 'Team',
						value: 'team',
					},
				],
				default: 'event',
			},

			// EVENT
			...eventOperations,
			...eventFields,

			// ISSUE
			...issueOperations,
			...issueFields,

			// ORGANIZATION
			...organizationOperations,
			...organizationFields,

			// PROJECT
			...projectOperations,
			...projectFields,

			// RELEASE
			...releaseOperations,
			...releaseFields,

			// TEAM
			...teamOperations,
			...teamFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all organizations so they can be displayed easily
			async getOrganizations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const organizations = await sentryApiRequestAllItems.call(
					this,
					'GET',
					`/api/0/organizations/`,
					{},
				);

				for (const organization of organizations) {
					returnData.push({
						name: organization.slug,
						value: organization.slug,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},
			// Get all projects so can be displayed easily
			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const projects = await sentryApiRequestAllItems.call(this, 'GET', `/api/0/projects/`, {});

				const organizationSlug = this.getNodeParameter('organizationSlug') as string;

				for (const project of projects) {
					if (organizationSlug !== project.organization.slug) {
						continue;
					}

					returnData.push({
						name: project.slug,
						value: project.slug,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},
			// Get an organization teams
			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const organizationSlug = this.getNodeParameter('organizationSlug') as string;
				const teams = await sentryApiRequestAllItems.call(
					this,
					'GET',
					`/api/0/organizations/${organizationSlug}/teams/`,
					{},
				);

				for (const team of teams) {
					returnData.push({
						name: team.slug,
						value: team.slug,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'event') {
					if (operation === 'getAll') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const projectSlug = this.getNodeParameter('projectSlug', i) as string;
						const full = this.getNodeParameter('full', i) as boolean;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const endpoint = `/api/0/projects/${organizationSlug}/${projectSlug}/events/`;

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.limit = limit;
						}

						qs.full = full;

						responseData = await sentryApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = responseData.splice(0, limit);
						}
					}
					if (operation === 'get') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const projectSlug = this.getNodeParameter('projectSlug', i) as string;
						const eventId = this.getNodeParameter('eventId', i) as string;

						const endpoint = `/api/0/projects/${organizationSlug}/${projectSlug}/events/${eventId}/`;

						responseData = await sentryIoApiRequest.call(this, 'GET', endpoint, qs);
					}
				}
				if (resource === 'issue') {
					if (operation === 'getAll') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const projectSlug = this.getNodeParameter('projectSlug', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const endpoint = `/api/0/projects/${organizationSlug}/${projectSlug}/issues/`;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (additionalFields.statsPeriod) {
							qs.statsPeriod = additionalFields.statsPeriod as string;
						}
						if (additionalFields.shortIdLookup) {
							qs.shortIdLookup = additionalFields.shortIdLookup as boolean;
						}
						if (additionalFields.query) {
							qs.query = additionalFields.query as string;
						}

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.limit = limit;
						}

						responseData = await sentryApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = responseData.splice(0, limit);
						}
					}
					if (operation === 'get') {
						const issueId = this.getNodeParameter('issueId', i) as string;
						const endpoint = `/api/0/issues/${issueId}/`;

						responseData = await sentryIoApiRequest.call(this, 'GET', endpoint, qs);
					}
					if (operation === 'delete') {
						const issueId = this.getNodeParameter('issueId', i) as string;
						const endpoint = `/api/0/issues/${issueId}/`;

						responseData = await sentryIoApiRequest.call(this, 'DELETE', endpoint, qs);

						responseData = { success: true };
					}
					if (operation === 'update') {
						const issueId = this.getNodeParameter('issueId', i) as string;
						const endpoint = `/api/0/issues/${issueId}/`;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (additionalFields.status) {
							qs.status = additionalFields.status as string;
						}
						if (additionalFields.assignedTo) {
							qs.assignedTo = additionalFields.assignedTo as string;
						}
						if (additionalFields.hasSeen) {
							qs.hasSeen = additionalFields.hasSeen as boolean;
						}
						if (additionalFields.isBookmarked) {
							qs.isBookmarked = additionalFields.isBookmarked as boolean;
						}
						if (additionalFields.isSubscribed) {
							qs.isSubscribed = additionalFields.isSubscribed as boolean;
						}
						if (additionalFields.isPublic) {
							qs.isPublic = additionalFields.isPublic as boolean;
						}

						responseData = await sentryIoApiRequest.call(this, 'PUT', endpoint, qs);
					}
				}
				if (resource === 'organization') {
					if (operation === 'get') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const endpoint = `/api/0/organizations/${organizationSlug}/`;

						responseData = await sentryIoApiRequest.call(this, 'GET', endpoint, qs);
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const endpoint = `/api/0/organizations/`;

						if (additionalFields.member) {
							qs.member = additionalFields.member as boolean;
						}
						if (additionalFields.owner) {
							qs.owner = additionalFields.owner as boolean;
						}

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.limit = limit;
						}

						responseData = await sentryApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);

						if (responseData === undefined) {
							responseData = [];
						}

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = responseData.splice(0, limit);
						}
					}
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const agreeTerms = this.getNodeParameter('agreeTerms', i) as boolean;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const endpoint = `/api/0/organizations/`;

						qs.name = name;
						qs.agreeTerms = agreeTerms;

						if (additionalFields.slug) {
							qs.slug = additionalFields.slug as string;
						}

						responseData = await sentryIoApiRequest.call(this, 'POST', endpoint, qs);
					}
					if (operation === 'update') {
						const organizationSlug = this.getNodeParameter('organization_slug', i) as string;
						const endpoint = `/api/0/organizations/${organizationSlug}/`;

						const body = this.getNodeParameter('updateFields', i) as IDataObject;

						responseData = await sentryIoApiRequest.call(this, 'PUT', endpoint, body, qs);
					}
				}
				if (resource === 'project') {
					if (operation === 'create') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const teamSlug = this.getNodeParameter('teamSlug', i) as string;
						const name = this.getNodeParameter('name', i) as string;

						const endpoint = `/api/0/teams/${organizationSlug}/${teamSlug}/projects/`;

						const body = {
							name,
							...(this.getNodeParameter('additionalFields', i) as IDataObject),
						};

						responseData = await sentryIoApiRequest.call(this, 'POST', endpoint, body, qs);
					}
					if (operation === 'get') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const projectSlug = this.getNodeParameter('projectSlug', i) as string;
						const endpoint = `/api/0/projects/${organizationSlug}/${projectSlug}/`;

						responseData = await sentryIoApiRequest.call(this, 'GET', endpoint, qs);
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const endpoint = `/api/0/projects/`;

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.limit = limit;
						}

						responseData = await sentryApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = responseData.splice(0, limit);
						}
					}
					if (operation === 'update') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const projectSlug = this.getNodeParameter('projectSlug', i) as string;
						const endpoint = `/api/0/projects/${organizationSlug}/${projectSlug}/`;
						const body = this.getNodeParameter('updateFields', i) as IDataObject;

						responseData = await sentryIoApiRequest.call(this, 'PUT', endpoint, body, qs);
					}
					if (operation === 'delete') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const projectSlug = this.getNodeParameter('projectSlug', i) as string;
						const endpoint = `/api/0/projects/${organizationSlug}/${projectSlug}/`;

						responseData = await sentryIoApiRequest.call(this, 'DELETE', endpoint, qs);
						responseData = { success: true };
					}
				}
				if (resource === 'release') {
					if (operation === 'get') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const version = this.getNodeParameter('version', i) as string;
						const endpoint = `/api/0/organizations/${organizationSlug}/releases/${version}/`;

						responseData = await sentryIoApiRequest.call(this, 'GET', endpoint, qs);
					}
					if (operation === 'getAll') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const endpoint = `/api/0/organizations/${organizationSlug}/releases/`;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (additionalFields.query) {
							qs.query = additionalFields.query as string;
						}

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.limit = limit;
						}

						responseData = await sentryApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = responseData.splice(0, limit);
						}
					}
					if (operation === 'delete') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const version = this.getNodeParameter('version', i) as string;
						const endpoint = `/api/0/organizations/${organizationSlug}/releases/${version}/`;
						responseData = await sentryIoApiRequest.call(this, 'DELETE', endpoint, qs);
						responseData = { success: true };
					}
					if (operation === 'create') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const endpoint = `/api/0/organizations/${organizationSlug}/releases/`;
						const version = this.getNodeParameter('version', i) as string;
						const url = this.getNodeParameter('url', i) as string;
						const projects = this.getNodeParameter('projects', i) as string[];

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (additionalFields.dateReleased) {
							qs.dateReleased = additionalFields.dateReleased as string;
						}

						qs.version = version;
						qs.url = url;
						qs.projects = projects;

						if (additionalFields.commits) {
							const commits: ICommit[] = [];
							//@ts-ignore
							// tslint:disable-next-line: no-any
							additionalFields.commits.commitProperties.map((commit: any) => {
								const commitObject: ICommit = { id: commit.id };

								if (commit.repository) {
									commitObject.repository = commit.repository;
								}
								if (commit.message) {
									commitObject.message = commit.message;
								}
								if (commit.patchSet && Array.isArray(commit.patchSet)) {
									commit.patchSet.patchSetProperties.map((patchSet: IPatchSet) => {
										commitObject.patch_set?.push(patchSet);
									});
								}
								if (commit.authorName) {
									commitObject.author_name = commit.authorName;
								}
								if (commit.authorEmail) {
									commitObject.author_email = commit.authorEmail;
								}
								if (commit.timestamp) {
									commitObject.timestamp = commit.timestamp;
								}

								commits.push(commitObject);
							});

							qs.commits = commits;
						}
						if (additionalFields.refs) {
							const refs: IRef[] = [];
							//@ts-ignore
							additionalFields.refs.refProperties.map((ref: IRef) => {
								refs.push(ref);
							});

							qs.refs = refs;
						}

						responseData = await sentryIoApiRequest.call(this, 'POST', endpoint, qs);
					}
					if (operation === 'update') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const version = this.getNodeParameter('version', i) as string;
						const endpoint = `/api/0/organizations/${organizationSlug}/releases/${version}/`;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body = { ...updateFields };

						if (updateFields.commits) {
							const commits: ICommit[] = [];
							//@ts-ignore
							// tslint:disable-next-line: no-any
							updateFields.commits.commitProperties.map((commit: any) => {
								const commitObject: ICommit = { id: commit.id };

								if (commit.repository) {
									commitObject.repository = commit.repository;
								}
								if (commit.message) {
									commitObject.message = commit.message;
								}
								if (commit.patchSet && Array.isArray(commit.patchSet)) {
									commit.patchSet.patchSetProperties.map((patchSet: IPatchSet) => {
										commitObject.patch_set?.push(patchSet);
									});
								}
								if (commit.authorName) {
									commitObject.author_name = commit.authorName;
								}
								if (commit.authorEmail) {
									commitObject.author_email = commit.authorEmail;
								}
								if (commit.timestamp) {
									commitObject.timestamp = commit.timestamp;
								}

								commits.push(commitObject);
							});

							body.commits = commits;
						}
						if (updateFields.refs) {
							const refs: IRef[] = [];
							//@ts-ignore
							updateFields.refs.refProperties.map((ref: IRef) => {
								refs.push(ref);
							});

							body.refs = refs;
						}

						responseData = await sentryIoApiRequest.call(this, 'PUT', endpoint, body, qs);
					}
				}
				if (resource === 'team') {
					if (operation === 'get') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const teamSlug = this.getNodeParameter('teamSlug', i) as string;
						const endpoint = `/api/0/teams/${organizationSlug}/${teamSlug}/`;

						responseData = await sentryIoApiRequest.call(this, 'GET', endpoint, qs);
					}
					if (operation === 'getAll') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const endpoint = `/api/0/organizations/${organizationSlug}/teams/`;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.limit = limit;
						}

						responseData = await sentryApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);

						if (returnAll === false) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = responseData.splice(0, limit);
						}
					}

					if (operation === 'create') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const endpoint = `/api/0/organizations/${organizationSlug}/teams/`;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						qs.name = name;

						if (additionalFields.slug) {
							qs.slug = additionalFields.slug;
						}

						responseData = await sentryIoApiRequest.call(this, 'POST', endpoint, qs);
					}
					if (operation === 'update') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const teamSlug = this.getNodeParameter('teamSlug', i) as string;
						const endpoint = `/api/0/teams/${organizationSlug}/${teamSlug}/`;

						const body = this.getNodeParameter('updateFields', i) as IDataObject;

						responseData = await sentryIoApiRequest.call(this, 'PUT', endpoint, body, qs);
					}
					if (operation === 'delete') {
						const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
						const teamSlug = this.getNodeParameter('teamSlug', i) as string;
						const endpoint = `/api/0/teams/${organizationSlug}/${teamSlug}/`;

						responseData = await sentryIoApiRequest.call(this, 'DELETE', endpoint, qs);
						responseData = { success: true };
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
