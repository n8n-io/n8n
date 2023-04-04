import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import OTPAuth from 'otpauth';

export class Totp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TOTP',
		name: 'totp',
		icon: 'fa:key',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] }}',
		description: 'Generate a TOTP code',
		defaults: {
			name: 'TOTP',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'totpApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Generate Secret',
						value: 'generateSecret',
						action: 'Generate secret',
					},
				],
				default: 'generateSecret',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const operation = this.getNodeParameter('operation', 0);
		const credentials = (await this.getCredentials('totpApi')) as { label: string; secret: string };

		const totp = new OTPAuth.TOTP({
			issuer: 'GitHub',
			label: credentials.label,
			secret: credentials.secret,
			algorithm: 'SHA1',
			digits: 6,
			period: 30,
		});

		const token = totp.generate();

		const secondsRemaining = (30 * (1 - ((Date.now() / 1000 / 30) % 1))) | 0;

		for (let i = 0; i < items.length; i++) {
			if (operation === 'generateSecret') {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ token, secondsRemaining }),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			}
		}

		return this.prepareOutputData(returnData);
	}
}
