import { camelCase } from 'change-case';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { pptrLogin } from '../Github/login.pptr';
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
		subtitle:
			'={{ $parameter["resource"].replace(/TreasuryOnline|StateTaxCenter/, "") + ": " + $parameter["operation"] }}',
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
						name: 'File & Pay a Tax Return',
						value: 'filePayTaxReturn',
						action: 'File & Pay a Tax Return',
						description: 'File a monthly Sales, Use, and Withholding tax return',
					},
					{
						name: 'Get Recent Returns',
						value: 'getRecentReturns',
						description:
							'Returns a list of tax returns for the specified account, including due dates and filing status',
						action: 'Get Recent Returns',
					},
					{
						name: 'Amend and Pay a Tax Return',
						value: 'amendAndPayTaxReturn',
						description: 'Make changes and submit payment for an already filed return',
						action: 'Amend and Pay a Tax Return',
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
				displayName:
					'Stripe team, "Get recent Tax Returns" is a placeholder operation (we did not have a Michigan business entity to test with). We added it to show that you could make modular, generic actions like "Get all" and reduce maintenance burden in Puppeteer (by handling biz logic + transforms in n8n).',
				name: 'notice99',
				type: 'notice',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['getRecentReturns'],
					},
				},
				default: '',
			},

			{
				displayName:
					'Stripe team, "Amend and Pay a Tax Return" is a placeholder operation (we did not have a Michigan business entity to test with). We added it to better illustrate how your custom nodes can turn multi-step portal flows into a simple form.',
				name: 'notice999',
				type: 'notice',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['amendAndPayTaxReturn'],
					},
				},
				default: '',
			},

			{
				displayName: 'FEIN or Treasury Number',
				name: 'fein',
				hint: 'Use SSN for sole proprietors',
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
					'Stripe team, we mocked this operation (it won\'t run). We added it to better illustrate how your custom nodes can turn multi-step portal flows into a simple form. Depending on options selected in "Tax types being submitted", relevant form fields will be added.',
				name: 'notice9',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['filePayTaxReturn'],
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
						operation: ['filePayTaxReturn'],
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
						operation: ['filePayTaxReturn'],
					},
				},
				default: '',
			},
			{
				displayName: 'Return Period',
				name: 'returnPeriod',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['filePayTaxReturn'],
					},
				},
				default: 'a',
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'Monthly - March 2023',
						value: 'a',
					},
					{
						name: 'Monthly - February 2023',
						value: 'b',
					},
					{
						name: 'Monthly - January 2023',
						value: 'c',
					},
					{
						name: 'Monthly - December 2023',
						value: 'd',
					},
					{
						name: 'Monthly - November 2023',
						value: 'e',
					},
					{
						name: 'Monthly - October 2023',
						value: 'f',
					},
				],
			},

			{
				displayName: 'Tax Types Being Submitted',
				name: 'typesBeingSubmitted',
				type: 'multiOptions',
				required: true,
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['filePayTaxReturn'],
					},
				},
				default: [],
				hint: 'Check all that apply',
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'Sales Tax',
						value: 'salesTax',
					},
					{
						name: 'Use Tax',
						value: 'useTax',
					},
					{
						name: 'Withholding Tax',
						value: 'withholdingTax',
					},
				],
			},

			// sales tax options

			{
				displayName: 'Gross Sales Tax',
				name: 'grossSalesTax',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['filePayTaxReturn'],
						typesBeingSubmitted: ['salesTax'],
					},
				},
				default: 0,
			},
			{
				displayName: 'Total Sales Tax',
				name: 'totalSalesTax',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['filePayTaxReturn'],
						typesBeingSubmitted: ['salesTax'],
					},
				},
				default: 0,
			},
			{
				displayName: 'Total Discounts Allowed',
				name: 'totalDiscountsAllowed',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['filePayTaxReturn'],
						typesBeingSubmitted: ['salesTax'],
					},
				},
				default: 0,
			},

			// use tax options

			{
				displayName: 'Gross Sales, Rentals, Accommodations and Telecommunications Services',
				name: 'grossSalesRentals',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['filePayTaxReturn'],
						typesBeingSubmitted: ['useTax'],
					},
				},
				default: 0,
			},
			{
				displayName: 'Total Use Tax',
				name: 'totalUseTax',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['filePayTaxReturn'],
						typesBeingSubmitted: ['useTax'],
					},
				},
				default: 0,
			},
			{
				displayName: 'Total Discounts Allowed',
				name: 'totalDiscountsAllowed',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['filePayTaxReturn'],
						typesBeingSubmitted: ['useTax'],
					},
				},
				default: 0,
			},
			{
				displayName: 'Total Use Tax Due',
				name: 'totalUseTaxDue',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['filePayTaxReturn'],
						typesBeingSubmitted: ['useTax'],
					},
				},
				default: 0,
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: 'Purchases for Which No Tax was Paid or Inventory...',
				description:
					'Purchases for Which No Tax was Paid or Inventory Purchased or Withdrawn for Business or Personal Use',
				name: 'purchasesForWhich',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['filePayTaxReturn'],
						typesBeingSubmitted: ['useTax'],
					},
				},
				default: 0,
			},
			{
				displayName: 'Total Use Tax on Purchases Due',
				name: 'totalUseTaxOnPurchasesDue',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['filePayTaxReturn'],
						typesBeingSubmitted: ['useTax'],
					},
				},
				default: 0,
			},

			{
				displayName: 'Total Amount of Michigan Income Tax Withheld',
				name: 'totalAmountOfMichiganIncomeTaxWithheld',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['michiganTreasuryOnline'],
						operation: ['filePayTaxReturn'],
						typesBeingSubmitted: ['withholdingTax'],
					},
				},
				default: 0,
			},

			// ---------------

			{
				displayName:
					'Hey Stripe team 👋 This "Create new account" operation is partially implemented. It will get through to the "Provide Account Information" step of the signup flow, enter the Sales Tax ID, then take a screenshot of the result.',
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
					'You could continue to list other form fields required in Georgia\'s account setup flow, we just couldn\'t get further in the UI flow since we don\'t have a Georgia Tax ID. n8n can handle an arbitrary number of various <a target="_blank" href="https://docs.n8n.io/integrations/creating-nodes/build/reference/ui-elements/">form field types</a>.',
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
				name: 'username',
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
				name: 'password',
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
				name: 'totpToken',
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
		let items = this.getInputData();

		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			if (operation === 'submitSalesTaxReturnMonthly') {
				const username = this.getNodeParameter('username', i) as string; // actually, email
				const password = this.getNodeParameter('password', i) as string;
				const token = this.getNodeParameter('totpToken', i) as string;

				const scrapedData = await pptrLogin(username, password, token);

				items = [
					{
						json: scrapedData,
					},
				];
			} else if (operation === 'verifyBusinessRelationship') {
				const username = this.getNodeParameter('username', i) as string;
				const password = this.getNodeParameter('password', i) as string;
				const fein = this.getNodeParameter('fein', i) as string;

				const screenshot = await michiganLogin(username, password, fein);

				const binaryData = await this.helpers.prepareBinaryData(
					screenshot,
					'example.png',
					'image/png',
				);

				items[i].binary = items[i].binary ?? {};
				items[i].binary!.dataPropertyName = binaryData;
			} else if (operation === 'createNewAccount') {
				const salesTaxId = this.getNodeParameter('salesTaxNumber', i) as string;

				const screenshot = await georgiaLogin(salesTaxId);

				const binaryData = await this.helpers.prepareBinaryData(
					screenshot,
					'example.png',
					'image/png',
				);

				items[i].binary = items[i].binary ?? {};
				items[i].binary!.dataPropertyName = binaryData;
			} else if (operation === 'filePayTaxReturn') {
				items = [
					{
						json: {
							message:
								"This operation is an example. Here you'd see a JSON representation of confirmation data (like a submission ID) or a screenshot of the success screen - whichever you prefer",
						},
					},
				];
			}
		}

		return this.prepareOutputData(items);
	}
}
