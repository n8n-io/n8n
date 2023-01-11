import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { companyFields, companyOperations } from './descriptions/CompanyDescription';

import { industryFields, industryOperations } from './descriptions/IndustryDescription';

import { inviteFields, inviteOperations } from './descriptions/InviteDescription';

import { portfolioFields, portfolioOperations } from './descriptions/PortfolioDescription';

import {
	portfolioCompanyFields,
	portfolioCompanyOperations,
} from './descriptions/PortfolioCompanyDescription';

import { reportFields, reportOperations } from './descriptions/ReportDescription';

import { scorecardApiRequest, simplify } from './GenericFunctions';

import moment from 'moment';

export class SecurityScorecard implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SecurityScorecard',
		name: 'securityScorecard',
		icon: 'file:securityScorecard.svg',
		group: ['transform'],
		subtitle: '={{$parameter["operation"]}} : {{$parameter["resource"]}}',
		version: 1,
		description: 'Consume SecurityScorecard API',
		defaults: {
			name: 'SecurityScorecard',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'securityScorecardApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				required: true,
				options: [
					{
						name: 'Company',
						value: 'company',
					},
					{
						name: 'Industry',
						value: 'industry',
					},
					{
						name: 'Invite',
						value: 'invite',
					},
					{
						name: 'Portfolio',
						value: 'portfolio',
					},
					{
						name: 'Portfolio Company',
						value: 'portfolioCompany',
					},
					{
						name: 'Report',
						value: 'report',
					},
				],
				default: 'company',
			},
			// Company
			...companyOperations,
			...companyFields,
			// Industry
			...industryOperations,
			...industryFields,
			// Invite
			...inviteOperations,
			...inviteFields,
			// Portfolio
			...portfolioOperations,
			...portfolioFields,
			// Portfolio Company
			...portfolioCompanyOperations,
			...portfolioCompanyFields,
			// Report
			...reportOperations,
			...reportFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const length = items.length;

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			if (resource === 'portfolio') {
				if (operation === 'create') {
					const name = this.getNodeParameter('name', i) as string;
					const description = this.getNodeParameter('description', i) as string;
					const privacy = this.getNodeParameter('privacy', i) as string;

					const body: IDataObject = {
						name,
						description,
						privacy,
					};

					responseData = await scorecardApiRequest.call(this, 'POST', 'portfolios', body);
					returnData.push(responseData as IDataObject);
				}

				if (operation === 'delete') {
					const portfolioId = this.getNodeParameter('portfolioId', i) as string;
					responseData = await scorecardApiRequest.call(
						this,
						'DELETE',
						`portfolios/${portfolioId}`,
					);
					returnData.push({ success: true });
				}

				if (operation === 'update') {
					const portfolioId = this.getNodeParameter('portfolioId', i) as string;
					const name = this.getNodeParameter('name', i) as string;
					const description = this.getNodeParameter('description', i) as string;
					const privacy = this.getNodeParameter('privacy', i) as string;

					const body: IDataObject = {
						name,
						description,
						privacy,
					};

					responseData = await scorecardApiRequest.call(
						this,
						'PUT',
						`portfolios/${portfolioId}`,
						body,
					);
					returnData.push(responseData as IDataObject);
				}

				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', 0);
					responseData = await scorecardApiRequest.call(this, 'GET', 'portfolios');
					responseData = responseData.entries;

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', 0);
						responseData = responseData.splice(0, limit);
					}

					returnData.push.apply(returnData, responseData as IDataObject[]);
				}
			}

			if (resource === 'portfolioCompany') {
				if (operation === 'add') {
					const portfolioId = this.getNodeParameter('portfolioId', i) as string;
					const domain = this.getNodeParameter('domain', i);
					responseData = await scorecardApiRequest.call(
						this,
						'PUT',
						`portfolios/${portfolioId}/companies/${domain}`,
					);
					returnData.push(responseData as IDataObject);
				}

				if (operation === 'remove') {
					const portfolioId = this.getNodeParameter('portfolioId', i) as string;
					const domain = this.getNodeParameter('domain', i);
					responseData = await scorecardApiRequest.call(
						this,
						'DELETE',
						`portfolios/${portfolioId}/companies/${domain}`,
					);
					returnData.push({ success: true });
				}

				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', 0);
					const portfolioId = this.getNodeParameter('portfolioId', i) as string;
					const filterParams = this.getNodeParameter('filters', i);
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`portfolios/${portfolioId}/companies`,
						{},
						filterParams,
					);

					responseData = responseData.entries;

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', 0);
						responseData = responseData.splice(0, limit);
					}

					returnData.push.apply(returnData, responseData as IDataObject[]);
				}
			}

			if (resource === 'report') {
				if (operation === 'download') {
					const reportUrl = this.getNodeParameter('url', i) as string;

					const response = await scorecardApiRequest.call(this, 'GET', '', {}, {}, reportUrl, {
						encoding: null,
						resolveWithFullResponse: true,
					});

					let mimeType: string | undefined;
					if (response.headers['content-type']) {
						mimeType = response.headers['content-type'];
					}

					const newItem: INodeExecutionData = {
						json: items[i].json,
						binary: {},
					};

					if (items[i].binary !== undefined && newItem.binary) {
						// Create a shallow copy of the binary data so that the old
						// data references which do not get changed still stay behind
						// but the incoming data does not get changed.
						Object.assign(newItem.binary, items[i].binary);
					}

					items[i] = newItem;

					const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i);

					const fileName = reportUrl.split('/').pop();

					const data = Buffer.from(response.body as string, 'utf8');
					items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
						data as unknown as Buffer,
						fileName,
						mimeType,
					);
				}

				if (operation === 'generate') {
					const reportType = this.getNodeParameter('report', i) as string;
					let body: IDataObject = {};

					if (reportType !== 'portfolio') {
						body.scorecard_identifier = this.getNodeParameter('scorecardIdentifier', i);
					} else {
						body.portfolio_id = this.getNodeParameter('portfolioId', i);
					}
					if (reportType === 'events-json') {
						body.date = this.getNodeParameter('date', i);
					}
					if (['issues', 'portfolio'].indexOf(reportType) > -1) {
						body.format = this.getNodeParameter('options.format', i) || 'pdf';
					}
					if (['detailed', 'summary'].indexOf(reportType) > -1) {
						body.branding = this.getNodeParameter('branding', i);
					}
					// json reports want the params differently
					if (['events-json', 'full-scorecard-json'].indexOf(reportType) > -1) {
						body = { params: body };
					}
					if (reportType === 'scorecard-footprint') {
						const options = this.getNodeParameter('options', i);
						Object.assign(body, options);
					}

					responseData = await scorecardApiRequest.call(
						this,
						'POST',
						`reports/${reportType}`,
						body,
					);

					returnData.push(responseData as IDataObject);
				}

				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', 0);
					responseData = await scorecardApiRequest.call(this, 'GET', 'reports/recent');
					responseData = responseData.entries;

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i);
						responseData = responseData.splice(0, limit);
					}
					returnData.push.apply(returnData, responseData as IDataObject[]);
				}
			}

			if (resource === 'invite') {
				if (operation === 'create') {
					const body: IDataObject = {
						email: this.getNodeParameter('email', i),
						first_name: this.getNodeParameter('firstName', i),
						last_name: this.getNodeParameter('lastName', i),
						message: this.getNodeParameter('message', i),
					};
					const additionalFields = this.getNodeParameter('additionalFields', i);
					Object.assign(body, additionalFields);

					responseData = await scorecardApiRequest.call(this, 'POST', 'invitations', body);
					returnData.push(responseData as IDataObject);
				}
			}

			if (resource === 'industry') {
				if (operation === 'getScore') {
					const industry = this.getNodeParameter('industry', i);
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`industries/${industry}/score`,
					);
					returnData.push(responseData as IDataObject);
				}

				if (operation === 'getFactor') {
					const simple = this.getNodeParameter('simple', 0) as boolean;
					const returnAll = this.getNodeParameter('returnAll', 0);
					const industry = this.getNodeParameter('industry', i);
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`industries/${industry}/history/factors`,
					);
					responseData = responseData.entries;

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i);
						responseData = responseData.splice(0, limit);
					}

					if (simple) {
						responseData = simplify(responseData);
					}

					returnData.push.apply(returnData, responseData as IDataObject[]);
				}

				if (operation === 'getFactorHistorical') {
					const simple = this.getNodeParameter('simple', 0) as boolean;
					const returnAll = this.getNodeParameter('returnAll', i);
					const industry = this.getNodeParameter('industry', i);
					const options = this.getNodeParameter('options', i);
					// Convert to YYYY-MM-DD
					if (options.from) {
						options.from = moment(options.from as Date).format('YYYY-MM-DD');
					}

					if (options.to) {
						options.to = moment(options.to as Date).format('YYYY-MM-DD');
					}
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`industries/${industry}/history/factors`,
						{},
						options,
					);
					responseData = responseData.entries;

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i);
						responseData = responseData.splice(0, limit);
					}

					if (simple) {
						responseData = simplify(responseData);
					}

					returnData.push.apply(returnData, responseData as IDataObject[]);
				}
			}

			if (resource === 'company') {
				if (operation === 'getScorecard') {
					const scorecardIdentifier = this.getNodeParameter('scorecardIdentifier', i) as string;
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`companies/${scorecardIdentifier}`,
					);
					returnData.push(responseData as IDataObject);
				}

				if (operation === 'getFactor') {
					const returnAll = this.getNodeParameter('returnAll', i);
					const scorecardIdentifier = this.getNodeParameter('scorecardIdentifier', i);
					const filterParams = this.getNodeParameter('filters', i);
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`companies/${scorecardIdentifier}/factors`,
						{},
						filterParams,
					);

					responseData = responseData.entries;

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i);
						responseData = responseData.splice(0, limit);
					}

					returnData.push.apply(returnData, responseData as IDataObject[]);
				}

				if (operation === 'getFactorHistorical') {
					const simple = this.getNodeParameter('simple', 0) as boolean;
					const returnAll = this.getNodeParameter('returnAll', i);
					const scorecardIdentifier = this.getNodeParameter('scorecardIdentifier', i) as string;
					const options = this.getNodeParameter('options', i);
					// Convert to YYYY-MM-DD
					if (options.date_from) {
						options.date_from = moment(options.date_from as Date).format('YYYY-MM-DD');
					}

					if (options.date_to) {
						options.date_to = moment(options.date_to as Date).format('YYYY-MM-DD');
					}
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`companies/${scorecardIdentifier}/history/factors/score`,
						{},
						options,
					);

					responseData = responseData.entries;

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i);
						responseData = responseData.splice(0, limit);
					}

					if (simple) {
						responseData = simplify(responseData);
					}

					returnData.push.apply(returnData, responseData as IDataObject[]);
				}

				if (operation === 'getHistoricalScore') {
					const simple = this.getNodeParameter('simple', 0) as boolean;
					const returnAll = this.getNodeParameter('returnAll', i);
					const scorecardIdentifier = this.getNodeParameter('scorecardIdentifier', i);
					const options = this.getNodeParameter('options', i);

					// for some reason the params are different between these two APis :/
					if (options.date_from) {
						options.from = moment(options.date_from as Date).format('YYYY-MM-DD');
						delete options.date_from;
					}
					if (options.date_to) {
						options.to = moment(options.date_to as Date).format('YYYY-MM-DD');
						delete options.date_to;
					}
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`companies/${scorecardIdentifier}/history/factors/score`,
						{},
						options,
					);
					responseData = responseData.entries;

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i);
						responseData = responseData.splice(0, limit);
					}

					if (simple) {
						responseData = simplify(responseData);
					}

					returnData.push.apply(returnData, responseData as IDataObject[]);
				}

				if (operation === 'getScorePlan') {
					const returnAll = this.getNodeParameter('returnAll', i);
					const scorecardIdentifier = this.getNodeParameter('scorecardIdentifier', i) as string;
					const targetScore = this.getNodeParameter('score', i);
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`companies/${scorecardIdentifier}/score-plans/by-target/${targetScore}`,
					);

					responseData = responseData.entries;

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i);
						responseData = responseData.splice(0, limit);
					}

					returnData.push.apply(returnData, responseData as IDataObject[]);
				}
			}
		}
		// Handle file download output data differently
		if (resource === 'report' && operation === 'download') {
			return this.prepareOutputData(items);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
