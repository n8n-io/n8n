import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import OTPAuth from 'otpauth';

export class Totp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Totp',
		name: 'totp',
		icon: 'fa:key',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] }}',
		description: 'Generate a TOTP code',
		defaults: {
			name: 'Totp',
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
		const credentials = await this.getCredentials('totpApi');

		const totp = new OTPAuth.TOTP({
			issuer: 'GitHub',
			label: credentials.label as string,
			secret: credentials.secret as string,
			algorithm: 'SHA1',
			digits: 6,
			period: 30,
		});

		const token = totp.generate();

		// console.log('label', credentials.label);
		// console.log('secret', credentials.secret);
		// console.log('lib1-token', token);

		// const remaining = (30 * (1 - ((Date.now() / 1000 / 30) % 1))) | 0;

		// console.log('remaining', remaining);

		for (let i = 0; i < items.length; i++) {
			if (operation === 'generateSecret') {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ token }),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			}
		}

		return this.prepareOutputData(returnData);
	}
}
