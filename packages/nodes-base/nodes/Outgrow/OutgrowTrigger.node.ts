import {
	INodeType,
	IPollFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeApiError,
	NodeConnectionTypes,
} from 'n8n-workflow';

export class OutgrowTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Outgrow Trigger',
		name: 'outgrowTrigger',
		icon: 'file:outgrow.svg',
		group: ['trigger'],
		version: 1,
		description: 'Fetch leads from Outgrow calculators at regular intervals',
		defaults: {
			name: 'Outgrow Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'OutgrowApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Calculator',
				name: 'calcId',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getCalculators',
				},
				default: '',
				description: 'Select which Outgrow calculator to monitor',
			},
		],
	};

	methods = {
		loadOptions: {
			async getCalculators(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('outgrowApi');
				if (!credentials?.apiKey) {
					throw new NodeApiError(this.getNode(), {
						message: 'API Key is missing or invalid',
					});
				}

				const url = `https://api-calc.outgrow.co/api/v1/get_cal/${credentials.apiKey}`;
				try {
					const response = await this.helpers.request({
						method: 'GET',
						url,
						json: true,
					});
					return response.map((calc: { id: string; calculator: string }) => ({
						name: calc.calculator,
						value: calc.id,
					}));
				} catch (error) {
					throw new NodeApiError(this.getNode(), error, {
						message: 'Failed to load calculators',
					});
				}
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const credentials = await this.getCredentials('outgrowApi');
		if (!credentials?.apiKey) {
			throw new NodeApiError(this.getNode(), {
				message: 'API Key is missing or invalid',
			});
		}

		const calcId = this.getNodeParameter('calcId', 0) as string;
		if (!calcId) {
			throw new NodeApiError(this.getNode(), {
				message: 'No calculator selected',
			});
		}

		const url = `https://api-calc.outgrow.co/api/v1/get_leads/${credentials.apiKey}/${calcId}`;

		try {
			const responseData = await this.helpers.request({
				method: 'GET',
				url,
				json: true,
			});

			if (responseData?.length > 0) {
				return [this.helpers.returnJsonArray(responseData)];
			}

			return null;
		} catch (error) {
			throw new NodeApiError(this.getNode(), error, {
				message: 'Outgrow API Error',
			});
		}
	}
}
