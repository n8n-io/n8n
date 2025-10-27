import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import * as OTPAuth from 'otpauth';

export class Totp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TOTP',
		name: 'totp',
		icon: 'fa:fingerprint',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] }}',
		description: 'Generate a time-based one-time password',
		defaults: {
			name: 'TOTP',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['generateSecret'],
					},
				},
				default: {},
				placeholder: 'Add option',
				options: [
					{
						displayName: 'Algorithm',
						name: 'algorithm',
						type: 'options',
						default: 'SHA1',
						description: 'HMAC hashing algorithm. Defaults to SHA1.',
						options: [
							{
								name: 'SHA1',
								value: 'SHA1',
							},
							{
								name: 'SHA224',
								value: 'SHA224',
							},
							{
								name: 'SHA256',
								value: 'SHA256',
							},
							{
								name: 'SHA3-224',
								value: 'SHA3-224',
							},
							{
								name: 'SHA3-256',
								value: 'SHA3-256',
							},
							{
								name: 'SHA3-384',
								value: 'SHA3-384',
							},
							{
								name: 'SHA3-512',
								value: 'SHA3-512',
							},
							{
								name: 'SHA384',
								value: 'SHA384',
							},
							{
								name: 'SHA512',
								value: 'SHA512',
							},
						],
					},
					{
						displayName: 'Digits',
						name: 'digits',
						type: 'number',
						default: 6,
						description: 'Number of digits in the generated TOTP code. Defaults to 6 digits.',
					},
					{
						displayName: 'Period',
						name: 'period',
						type: 'number',
						default: 30,
						description:
							'How many seconds the generated TOTP code is valid for. Defaults to 30 seconds.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const operation = this.getNodeParameter('operation', 0);
		const credentials = await this.getCredentials<{ label: string; secret: string }>('totpApi');

		if (!credentials.label.includes(':')) {
			throw new NodeOperationError(this.getNode(), 'Malformed label - expected `issuer:username`');
		}

		const options = this.getNodeParameter('options', 0) as {
			algorithm?: string;
			digits?: number;
			period?: number;
		};

		if (!options.algorithm) options.algorithm = 'SHA1';
		if (!options.digits) options.digits = 6;
		if (!options.period) options.period = 30;

		const [issuer] = credentials.label.split(':');

		const totp = new OTPAuth.TOTP({
			issuer,
			label: credentials.label,
			secret: credentials.secret,
			algorithm: options.algorithm,
			digits: options.digits,
			period: options.period,
		});

		const token = totp.generate();

		const secondsRemaining =
			(options.period * (1 - ((Date.now() / 1000 / options.period) % 1))) | 0;

		if (operation === 'generateSecret') {
			for (let i = 0; i < items.length; i++) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ token, secondsRemaining }),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			}
		}

		return [returnData];
	}
}
