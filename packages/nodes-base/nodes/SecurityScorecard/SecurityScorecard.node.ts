import { 
	IExecuteFunctions 
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import moment = require('moment');

import { 
	companyFields, 
	companyOperations 
} from './descriptions/CompanyDescription';

import { 
	industryFields,
	industryOperations
} from './descriptions/IndustryDescription';

import {
	inviteFields,
	inviteOperations
} from './descriptions/InviteDescription';

import {
	portfolioFields,
	portfolioOperations
} from './descriptions/PortfolioDescription';

import {
	reportFields,
	reportOperations
} from './descriptions/ReportDescription';
import { scorecardApiRequest } from './GenericFunctions';


export class SecurityScorecard implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SecurityScorecard',
		name: 'securityScorecard',
		icon: 'file:securityscorecard.png',
		group: ['transform'],
		subtitle: '={{$parameter["operation"]}} : {{$parameter["resource"]}}',
		version: 1,
		description: 'Consume SecurityScorecard API',
		defaults: {
			name: 'SecurityScorecard',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'securityScorecard',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				required: true,
				options: [
					{
						name: 'Companies',
						value: 'companies',
					},
					{
						name: 'Industries',
						value: 'industries',
					},
					{
						name: 'Invites',
						value: 'invites',
					},
					{
						name: 'Portfolios',
						value: 'portfolios',
					},
					{
						name: 'Reports',
						value: 'reports',
					},
				],
				default: 'companies',
			},
			// Portfolios
			...portfolioOperations,
			...portfolioFields,
			// Reports
			...reportOperations,
			...reportFields,
			// Invites
			...inviteOperations,
			...inviteFields,
			// Companies
			...companyOperations,
			...companyFields,
			// Industries
			...industryOperations,
			...industryFields,
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			let responseData;
			
			if (resource === 'portfolios') {
				if (operation === 'addCompany') {
					const portfolioId = this.getNodeParameter('portfolioId', i) as string;
					const domain = this.getNodeParameter('domain', i);
					responseData = await scorecardApiRequest.call(
						this,
						'PUT',
						`portfolios/${portfolioId}/companies/${domain}`,
					);
					returnData.push(responseData as IDataObject);
				}

				if (operation === 'create') {
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
						'POST',
						'portfolios',
						body,
					);
					returnData.push(responseData as IDataObject);
				}

				if (operation === 'delete') {
					const portfolioId = this.getNodeParameter('portfolioId', i) as string;
					responseData = await scorecardApiRequest.call(
						this,
						'DELETE',
						`portfolios/${portfolioId}`,
					);
					returnData.push({"success": true});
				}

				if (operation === 'deleteCompany') {
					const portfolioId = this.getNodeParameter('portfolioId', i) as string;
					const domain = this.getNodeParameter('domain', i);
					responseData = await scorecardApiRequest.call(
						this,
						'DELETE',
						`portfolios/${portfolioId}/companies/${domain}`,
					);
					returnData.push({'success': true});
				}

				if (operation === 'edit') {
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
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						'portfolios',
					);
					returnData.push.apply(returnData, responseData.entries as IDataObject[]);
				}				

				if (operation === 'getCompanies') {
					const portfolioId = this.getNodeParameter('portfolioId', i) as string;
					const filterParams = this.getNodeParameter('filters', i) as IDataObject;
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`portfolios/${portfolioId}/companies`,
						{},
						filterParams,
					);
					returnData.push.apply(returnData, responseData.entries as IDataObject[]);
				}
			}

			if (resource === 'reports') {
				if (operation === 'download') {
					const reportUrl = this.getNodeParameter('url', i) as string;

					const response = await scorecardApiRequest.call(
						this,
						'GET',
						'',
						{},
						{},
						reportUrl,
						{encoding: null, resolveWithFullResponse: true });

					let mimeType: string | undefined;
					if (response.headers['content-type']) {
						mimeType = response.headers['content-type'];
					}
					
					const newItem: INodeExecutionData = {
						json: items[i].json,
						binary: {},
					};

					if (items[i].binary !== undefined) {
						// Create a shallow copy of the binary data so that the old
						// data references which do not get changed still stay behind
						// but the incoming data does not get changed.
						Object.assign(newItem.binary, items[i].binary);
					}

					items[i] = newItem;

					const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i) as string;

					const fileName = reportUrl.split('/').pop();
					
					const data = Buffer.from(response.body as string, 'utf8');
					items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(data as unknown as Buffer, fileName, mimeType);
				}

				if (operation === 'generate') {
					const reportType = this.getNodeParameter('report', i) as string;
					let body: IDataObject = {};

					if (reportType !== 'portfolio') {
						body['scorecard_identifier'] = this.getNodeParameter('scorecardIdentifier', i);
					} else {
						body['portfolio_id'] = this.getNodeParameter('portfolioId', i);
					}
					if (reportType === 'events-json') {
						body['date'] = this.getNodeParameter('date', i);
					}
					if (['issues', 'portfolio'].indexOf(reportType) > -1) {
						body['format'] = this.getNodeParameter('optional.format', i);
					}
					if (['detailed', 'summary'].indexOf(reportType) > -1) {
						body['branding'] = this.getNodeParameter('branding', i);
					}
					// json reports want the params differently
					if (['events-json', 'full-scorecard-json'].indexOf(reportType) > -1) {
						body = {params: body};
					}
					if (reportType === 'scorecard-footprint') {
						const optionalFields = this.getNodeParameter('optional', i) as IDataObject;
						Object.assign(body, optionalFields);
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
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						'reports/recent',
					);
					returnData.push.apply(returnData, responseData.entries as IDataObject[]);
				}
			}

			if (resource === 'invites') {
				if (operation === 'create') {
					const body : IDataObject = {
						email: this.getNodeParameter('email', i),
						first_name: this.getNodeParameter('firstName', i),
						last_name: this.getNodeParameter('lastName', i),
						message: this.getNodeParameter('message', i),
					};
					const optionalFields = this.getNodeParameter('optional', i);
					Object.assign(body, optionalFields);

					responseData = await scorecardApiRequest.call(
						this,
						'POST',
						`invitations`,
						body,
					);
					returnData.push(responseData as IDataObject);
				}
			}

			if (resource === 'industries') {
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
					const industry = this.getNodeParameter('industry', i);
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`industries/${industry}/history/factors`,
					);
					returnData.push.apply(returnData, responseData.entries as IDataObject[]);
				}

				if (operation === 'getFactorHistorical') {
					const industry = this.getNodeParameter('industry', i);
					const options = this.getNodeParameter('options', i) as IDataObject;
					// Convert to YYYY-MM-DD
					if (options['from']) {
						options['from'] = moment(options['from'] as Date).format('YYYY-MM-DD');
					}

					if (options['to']) {
						options['to'] = moment(options['to'] as Date).format('YYYY-MM-DD');
					}
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`industries/${industry}/history/factors`,
						{},
						options,
					);
					returnData.push.apply(returnData, responseData.entries as IDataObject[]);
				}
			}

			if (resource === 'companies') {
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
					const scorecardIdentifier = this.getNodeParameter('scorecardIdentifier', i);
					const filterParams = this.getNodeParameter('filters', i) as IDataObject;
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`companies/${scorecardIdentifier}/factors`,
						{},
						filterParams,
					);
					returnData.push.apply(returnData, responseData.entries as IDataObject[]);
				}

				if (operation === 'getFactorHistorical') {
					const scorecardIdentifier = this.getNodeParameter('scorecardIdentifier', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;
					// Convert to YYYY-MM-DD
					if (options['date_from']) {
						options['date_from'] = moment(options['date_from'] as Date).format('YYYY-MM-DD');
					}

					if (options['date_to']) {
						options['date_to'] = moment(options['date_to'] as Date).format('YYYY-MM-DD');
					}
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`companies/${scorecardIdentifier}/history/factors/score`,
						{},
						options,
					);
					returnData.push.apply(returnData, responseData.entries as IDataObject[]);
				}

				if (operation === 'getHistoricalScore') {
					const scorecardIdentifier = this.getNodeParameter('scorecardIdentifier', i);
					const options = this.getNodeParameter('options', i) as IDataObject;

					// for some reason the params are different between these two APis :/
					if (options['date_from']) {
						options['from'] = moment(options['date_from'] as Date).format('YYYY-MM-DD');
						delete options['date_from'];
					}
					if (options['date_to']) {
						options['to'] = moment(options['date_to'] as Date).format('YYYY-MM-DD');
						delete options['date_to'];
					}
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`companies/${scorecardIdentifier}/history/factors/score`,
						{},
						options,
					);
					returnData.push.apply(returnData, responseData.entries as IDataObject[]);
				}

				if (operation === 'getScorePlan') {
					const scorecardIdentifier = this.getNodeParameter('scorecardIdentifier', i) as string;
					const targetScore = this.getNodeParameter('score', i);
					responseData = await scorecardApiRequest.call(
						this,
						'GET',
						`companies/${scorecardIdentifier}/score-plans/by-target/${targetScore}`,
					);
					returnData.push.apply(returnData, responseData.entries as IDataObject[]);
				}
			}
		}
		// Handle file download output data differently
		if (resource === 'reports' && operation === 'download') {
			return this.prepareOutputData(items);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
