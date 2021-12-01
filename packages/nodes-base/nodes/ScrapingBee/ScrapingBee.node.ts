import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeCredentialTestResult,
} from 'n8n-workflow';

import {
	handleBinaryData,
	scrapingBeeApiRequest,
} from './GenericFunctions';

import {
	scrapeAdditionalFields,
	screenshotAdditionalFields,
} from './descriptions';

import {
	ScrapingBeeAdditionalOptions,
} from './types';

import {
	OptionsWithUri,
} from 'request';

export class ScrapingBee implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ScrapingBee',
		name: 'scrapingBee',
		icon: 'file:scrapingBee.svg',
		group: ['input'],
		version: 1,
		description: 'Consume the ScrapingBee API',
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["url"] }}',
		defaults: {
			name: 'ScrapingBee',
			color: '#f26c23',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'scrapingBeeApi',
				required: true,
				testedBy: 'scrapingBeeApiTest',
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				noDataExpression: true,
				type: 'options',
				options: [
					{
						name: 'Scrape',
						value: 'scrape',
					},
					{
						name: 'Screenshot',
						value: 'screenshot',
					},
				],
				default: 'scrape',
				description: 'Resource to consume',
			},
			{
				displayName: 'Target URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://n8n.io',
				default: '',
				required: true,
			},
			scrapeAdditionalFields,
			{
				displayName: 'Binary Property',
				name: 'binaryProperty',
				type: 'string',
				required: true,
				default: 'data',
				description: 'Name of the binary property to which to write to',
				displayOptions: {
					show: {
						operation: [
							'screenshot',
						],
					},
				},
			},
			screenshotAdditionalFields,
		],
	};

	methods = {
		credentialTest: {
			async scrapingBeeApiTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<NodeCredentialTestResult> {
				const { apiKey } = credential.data as { apiKey: string };

				const options: OptionsWithUri = {
					method: 'get',
					uri: 'https://app.scrapingbee.com/api/v1',
					qs: {
						api_key: apiKey,
						url: 'https://en.wikipedia.org',
					},
					headers: {
						'User-Agent': 'n8n',
					},
					json: true,
				};

				try {
					await this.helpers.request(options);
					return {
						status: 'OK',
						message: 'Credential test successful',
					};
				} catch (error) {
					return {
						status: 'Error',
						message: error.message,
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		let responseData;

		for (let i = 0; i < items.length; i++) {

			try {
				const qs: IDataObject & { url: string } = {
					url: this.getNodeParameter('url', i) as string,
				};

				if (qs.url.includes('google.com')) {
					qs.custom_google = true;
				}

				const {
					method = 'get',
					block_targets,
					extract_rules,
					headers: rawHeaders,
					screenshot_size,
					...rest
				} = this.getNodeParameter('additionalFields', i) as ScrapingBeeAdditionalOptions;

				if (Object.keys(rest).length) {
					Object.assign(qs, rest);
				}

				if (block_targets?.length) {
					block_targets.forEach(target => {
						qs[target] = true;
					});
				}

				if (extract_rules) {
					qs.extract_rules = JSON.stringify(JSON.parse(decodeURI(extract_rules)));
				}

				let headers = {};
				if (rawHeaders?.headerValues.length) {
					qs.forward_headers = true;
					headers = rawHeaders.headerValues.reduce<Record<string, string>>((acc, cur) => {
						acc[`Spb-${cur.key}`] = cur.value;
						return acc;
					}, {});
				}

				if (screenshot_size) {
					qs.screenshot = true;
					qs[screenshot_size] = true;
				}

				responseData = screenshot_size
					? await handleBinaryData.call(this, items, i, method, headers, qs)
					: await scrapingBeeApiRequest.call(this, method, headers, qs);

			} catch (error) {
				if (this.continueOnFail()) {
					// @ts-ignore
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
