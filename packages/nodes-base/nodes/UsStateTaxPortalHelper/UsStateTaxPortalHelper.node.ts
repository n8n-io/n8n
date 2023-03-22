import { camelCase } from 'change-case';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { accountTypes } from './accountTypes';
import { georgiaLogin } from './georgia.debug';
import { michiganLogin } from './michigan.debug';

export class UsStateTaxPortalHelper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'US State Tax Portal Helper',
		name: 'usStateTaxPortalHelper',
		icon: 'file:tax.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] }}',
		description:
			'Internal Stripe Tax tool to interact with State tax portals that don’t have an API',
		defaults: {
			name: 'US State Tax Portal Helper',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Georgia State Tax Center',
						value: 'georgiaStateTaxCenter',
					},
					{
						name: 'Michigan Treasury Online',
						value: 'michiganTreasuryOnline',
					},
				],
				default: 'georgiaStateTaxCenter',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create New Account',
						value: 'createNewAccount',
						action: 'Create New Account',
						description:
							'Create a new account on gtc.dor.ga.gov. Requires: Tax type, FEIN (or SSN), Last payment, Zip code, Email address.',
					},
					{
						name: 'Submit Sales Tax Return (Monthly)',
						value: 'submitSalesTaxReturnMonthly',
						action: 'Submit Sales Tax Return (Monthly)',
						description:
							'File a sales tax return with Georgia Tax Center. Also handles 2FA sign-in.',
					},
				],
				default: 'createNewAccount',
				displayOptions: {
					show: {
						resource: ['georgiaStateTaxCenter'],
					},
				},
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Verify Business Relationship',
						value: 'verifyBusinessRelationship',
						action: 'Verify Business Relationship',
						description:
							'Link a business entity to a Michigan Treasury Online User Profile. Also labeled "Create a New Relationship" in MTO portal.',
					},
					{
						name: 'Submit Sales, Use, and Withholding Tax Return',
						value: 'submitSalesUseAndWithholdingTaxReturn',
						action: 'Submit Sales, Use, and Withholding Tax Return',
					},
				],
				default: 'verifyBusinessRelationship',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
					},
				},
			},

			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['verifyBusinessRelationship'],
					},
				},
				default: '',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['verifyBusinessRelationship'],
					},
				},
				default: '',
			},

			{
				displayName:
					'Hey Stripe team 👋 This "Create new account" operation is partially implemented. It will get through to the "Provide Account Information" step of the signup flow, enter the Sales Tax ID, click "next" then take a screenshot of the result (will be "Invalid Sales Tax #" message). The parameters below are shown to illustrate how you could create usecase specific workflow steps, that have simple form-like structures. Check out the "Michigan Treasury Online" resource for a working example of signing into a Govt Portal, or "Submit sales tax return (monthly)" operation to see a working 2FA (TOPT) login example.',
				name: 'notice1',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['georgiaStateTaxCenter'],
						operation: ['createNewAccount'],
					},
				},
			},
			{
				displayName: 'Account Type',
				name: 'accountType',
				type: 'options',
				options: accountTypes.map((t) => {
					return { name: t, value: camelCase(t).replace(/\s/g, '') };
				}),
				default: 'salesUseTax',
				displayOptions: {
					show: {
						resource: ['georgiaStateTaxCenter'],
						operation: ['createNewAccount'],
					},
				},
			},
			{
				displayName:
					'👆 You don\'t necessarily have to expose "Account Type" to your workflow builders. You could hardcode "Sales & Use Tax" if that\'s the only type of account you create OR show a subset of options in the above dropdown',
				name: 'notice2',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['georgiaStateTaxCenter'],
						operation: ['createNewAccount'],
					},
				},
			},
			{
				displayName: 'Sales Tax #',
				name: 'salesTaxNumber',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['georgiaStateTaxCenter'],
						operation: ['createNewAccount'],
						accountType: ['salesUseTax'],
					},
				},
			},
			{
				displayName:
					'You could continue to list other form fields required in Georgia\'s account setup flow, we just couldn\'t get further in the UI flow since we don\'t have a Georgia Tax ID. n8n can handle an abitrary number of various <a target="_blank" href="https://docs.n8n.io/integrations/creating-nodes/build/reference/ui-elements/">form field types</a>.',
				name: 'notice3',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['georgiaStateTaxCenter'],
						operation: ['createNewAccount'],
						accountType: ['salesUseTax'],
					},
				},
			},
			{
				displayName:
					"We couldn't actually create a Georgia Tax Center account. In lieu, we show how this custom operation can sign into <b>GitHub with 2FA enabled</b>, and return some info in JSON format. We see no blockers to doing the same for Government Tax portals, as we assume GitHub would have more security protections than typical State portal.",
				name: 'notice4',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['georgiaStateTaxCenter'],
						operation: ['submitSalesTaxReturnMonthly'],
					},
				},
			},
			{
				displayName: 'Log-in Username',
				name: 'loginUsername',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['georgiaStateTaxCenter'],
						operation: ['submitSalesTaxReturnMonthly'],
					},
				},
			},
			{
				displayName: 'Log-in Password',
				name: 'loginPassword',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				displayOptions: {
					show: {
						resource: ['georgiaStateTaxCenter'],
						operation: ['submitSalesTaxReturnMonthly'],
					},
				},
			},
			{
				displayName: 'Log-in 2FA Code (TOPT)',
				name: 'login2fa',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['georgiaStateTaxCenter'],
						operation: ['submitSalesTaxReturnMonthly'],
					},
				},
			},
			{
				displayName:
					"From here, you could add more form fields to match up with data you'd need to input when filing a Georgia Sales Tax return",
				name: 'notice5',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['georgiaStateTaxCenter'],
						operation: ['submitSalesTaxReturnMonthly'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			if (operation === 'verifyBusinessRelationship') {
				const username = this.getNodeParameter('username', i) as string;
				const password = this.getNodeParameter('password', i) as string;

				const screenshot = await michiganLogin(username, password);

				const binaryData = await this.helpers.prepareBinaryData(
					screenshot,
					'example.png',
					'image/png',
				);

				items[i].binary = items[i].binary ?? {};
				items[i].binary!.dataPropertyName = binaryData;
			} else if (operation === 'createNewAccount') {
				const screenshot = await georgiaLogin();

				const binaryData = await this.helpers.prepareBinaryData(
					screenshot,
					'example.png',
					'image/png',
				);

				items[i].binary = items[i].binary ?? {};
				items[i].binary!.dataPropertyName = binaryData;
			}
		}

		return this.prepareOutputData(items);
	}
}
