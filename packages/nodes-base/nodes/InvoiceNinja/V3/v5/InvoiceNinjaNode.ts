import type { IExecuteFunctions } from 'n8n-core';

import type {
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from '../GenericFunctions';

import { countryCodes, currencies, frequencies, paymentTypes } from './Entities';

// import Descriptions
import { bankTransactionFields, bankTransactionOperations } from './BankTransactionDescription';
import { clientFields, clientOperations } from './ClientDescription';
import { creditFields, creditOperations } from './CreditDescription';
import { documentFields, documentOperations } from './DocumentDescription';
import { expenseFields, expenseOperations } from './ExpenseDescription';
import { invoiceFields, invoiceOperations } from './InvoiceDescription';
import { paymentFields, paymentOperations } from './PaymentDescription';
import { productFields, productOperations } from './ProductDescription';
import { projectFields, projectOperations } from './ProjectDescription';
import { purchaseOrderFields, purchaseOrderOperations } from './PurchaseOrderDescription';
import { quoteFields, quoteOperations } from './QuoteDescription';
import { recurringExpenseFields, recurringExpenseOperations } from './RecurringExpenseDescription';
import { recurringInvoiceFields, recurringInvoiceOperations } from './RecurringInvoiceDescription';
import { subscriptionFields, subscriptionOperations } from './SubscriptionDescription';
import { systemFields, systemOperations } from './SystemDescription';
import { taskFields, taskOperations } from './TaskDescription';
import { vendorFields, vendorOperations } from './VendorDescription';

// import Executions
import * as BankTransactionExecution from './BankTransactionExecution';
import * as ClientExecution from './ClientExecution';
import * as CreditExecution from './CreditExecution';
import * as DocumentExecution from './DocumentExecution';
import * as ExpenseExecution from './ExpenseExecution';
import * as InvoiceExecution from './InvoiceExecution';
import * as PaymentExecution from './PaymentExecution';
import * as ProductExecution from './ProductExecution';
import * as ProjectExecution from './ProjectExecution';
import * as PurchaseOrderExecution from './PurchaseOrderExecution';
import * as QuoteExecution from './QuoteExecution';
import * as RecurringExpenseExecution from './RecurringExpenseExecution';
import * as RecurringInvoiceExecution from './RecurringInvoiceExecution';
import * as SubscriptionExecution from './SubscriptionExecution';
import * as SystemExecution from './SystemExecution';
import * as TaskExecution from './TaskExecution';
import * as VendorExecution from './VendorExecution';

const headProperties: INodeProperties[] = [
	{
		displayName: 'Resource (V5)',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
			},
		},
		description:
			'You are using InvoiceNinja V5: Check Swagger documentation for additional fields: <a href="https://app.swaggerhub.com/apis/invoiceninja/invoiceninja/" target="_blank">https://app.swaggerhub.com/apis/invoiceninja/invoiceninja/</a>Change your Version at the Node-Settings',
		options: [
			{
				name: 'Bank Transaction',
				value: 'bankTransaction',
			},
			{
				name: 'Client',
				value: 'client',
			},
			{
				name: 'Credit',
				value: 'credit',
			},
			{
				name: 'Document',
				value: 'document',
			},
			{
				name: 'Expense',
				value: 'expense',
			},
			{
				name: 'Invoice',
				value: 'invoice',
			},
			{
				name: 'Payment',
				value: 'payment',
			},
			{
				name: 'Product',
				value: 'product',
			},
			{
				name: 'Project',
				value: 'project',
			},
			{
				name: 'Purchase Order',
				value: 'purchaseOrder',
			},
			{
				name: 'Quote',
				value: 'quote',
			},
			{
				name: 'Recurring Expense',
				value: 'recurringExpense',
			},
			{
				name: 'Recurring Invoice',
				value: 'recurringInvoice',
			},
			{
				name: 'Subscription',
				value: 'subscription',
			},
			{
				name: 'System / Other',
				value: 'system',
			},
			{
				name: 'Task',
				value: 'task',
			},
			{
				name: 'Vendor',
				value: 'vendor',
			},
		],
		default: 'client',
	},
];

export const InvoiceNinjaV5 = {
	description: {
		properties: [
			...headProperties,
			...bankTransactionOperations,
			...bankTransactionFields,
			...clientOperations,
			...clientFields,
			...creditOperations,
			...creditFields,
			...documentOperations,
			...documentFields,
			...expenseOperations,
			...expenseFields,
			...invoiceOperations,
			...invoiceFields,
			...paymentOperations,
			...paymentFields,
			...productOperations,
			...productFields,
			...projectOperations,
			...projectFields,
			...purchaseOrderOperations,
			...purchaseOrderFields,
			...quoteOperations,
			...quoteFields,
			...recurringExpenseOperations,
			...recurringExpenseFields,
			...recurringInvoiceOperations,
			...recurringInvoiceFields,
			...subscriptionOperations,
			...subscriptionFields,
			...systemOperations,
			...systemFields,
			...taskOperations,
			...taskFields,
			...vendorOperations,
			...vendorFields,
		],
	},

	methods: {
		loadOptions: {
			// Get all the available bank integrations to display them to user so that he can
			// select them easily
			async getBankIntegrationsV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let banks = await invoiceNinjaApiRequestAllItems.call(
					this,
					'data',
					'GET',
					'/bank_integrations',
				);
				banks = banks.filter((e) => !e.is_deleted);
				for (const bank of banks) {
					const providerName = bank.provider_name as string;
					const accountName = bank.bank_account_name as string;
					const bankId = bank.id as string;
					returnData.push({
						name:
							providerName != accountName
								? `${providerName} - ${accountName}`
								: accountName || providerName,
						value: bankId,
					});
				}
				return returnData;
			},
			// Get all the available clients to display them to user so that he can
			// select them easily
			async getClientsV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const clients = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/clients');
				for (const client of clients) {
					const clientName = client.display_name as string;
					const clientId = client.id as string;
					returnData.push({
						name: clientName,
						value: clientId,
					});
				}
				return returnData;
			},
			// Get all the available country codes to display them to user so that he can
			// select them easily
			async getCountryCodesV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (let i = 0; i < countryCodes.length; i++) {
					const countryName = countryCodes[i].name as string;
					const countryId = countryCodes[i].numeric as string;
					returnData.push({
						name: countryName,
						value: countryId,
					});
				}
				return returnData;
			},
			// Get all the available country codes to display them to user so that he can
			// select them easily
			async getCurrenciesV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (let i = 0; i < currencies.length; i++) {
					const currencyName = `${currencies[i].code} - ${currencies[i].name}`;
					const currencyId = currencies[i].id as string;
					returnData.push({
						name: currencyName,
						value: currencyId,
					});
				}
				return returnData;
			},
			// Get all the available designs to display them to user so that he can
			// select them easily
			async getDesignsV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let designs = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/designs');
				designs = designs.filter((e) => !e.is_deleted);
				for (const design of designs) {
					const designName = design.name as string;
					const designId = design.id as string;
					returnData.push({
						name: designName,
						value: designId,
					});
				}
				return returnData;
			},
			// Get all the available expense categories to display them to user so that he can
			// select them easily
			async getExpenseCategoriesV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let categories = await invoiceNinjaApiRequestAllItems.call(
					this,
					'data',
					'GET',
					'/expense_categories',
				);
				categories = categories.filter((e) => !e.is_deleted);
				for (const category of categories) {
					const categoryName = category.name as string;
					const categoryId = category.id as string;
					returnData.push({
						name: categoryName,
						value: categoryId,
					});
				}
				return returnData;
			},
			// Get all the available country codes to display them to user so that he can
			// select them easily
			async getFrequenciesV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (let i = 0; i < frequencies.length; i++) {
					const frequencyName = frequencies[i].name as string;
					const frequencyId = frequencies[i].id as string;
					returnData.push({
						name: frequencyName,
						value: frequencyId,
					});
				}
				return returnData;
			},
			// Get all the available country codes to display them to user so that he can
			// select them easily
			async getPaymentTypesV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (let i = 0; i < paymentTypes.length; i++) {
					const paymentName = paymentTypes[i].name as string;
					const paymentTypeId = paymentTypes[i].value as string;
					returnData.push({
						name: paymentName,
						value: paymentTypeId,
					});
				}
				return returnData;
			},
			// Get all the available projects to display them to user so that he can
			// select them easily
			async getProjectsV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const projects = await invoiceNinjaApiRequest
					.call(this, 'GET', '/projects', {}, { per_page: 100 })
					.then((res) => res.data);
				for (const project of projects) {
					const projectName = project.name as string;
					const projectId = project.id as string;
					returnData.push({
						name: projectName,
						value: projectId,
					});
				}
				return returnData;
			},
			// Get all the available invoices to display them to user so that he can
			// select them easily
			async getInvoicesV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const invoices = await invoiceNinjaApiRequest
					.call(this, 'GET', '/invoices', {}, { per_page: 100 })
					.then((res) => res.data);
				for (const invoice of invoices) {
					const invoiceName = invoice.number as string;
					const invoiceId = invoice.id as string;
					returnData.push({
						name: invoiceName,
						value: invoiceId,
					});
				}
				return returnData;
			},
			// Get all the available task_statuses to display them to user so that he can
			// select them easily
			async getTaskStatusesV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const statuses = await invoiceNinjaApiRequestAllItems.call(
					this,
					'data',
					'GET',
					'/task_statuses',
				);
				console.log(statuses);
				for (const status of statuses) {
					const statusName = status.name as string;
					const statusId = status.id as string;
					returnData.push({
						name: statusName,
						value: statusId,
					});
				}
				return returnData;
			},
			// Get all the available recuring expenses to display them to user so that he can
			// select them easily
			async getRecuringExpensesV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const recurringExpenses = await invoiceNinjaApiRequest
					.call(this, 'GET', '/recurring_expenses', {}, { per_page: 100 })
					.then((res) => res.data);
				for (const recurringExpense of recurringExpenses) {
					const recurringExpenseName = recurringExpense.number as string;
					const recurringExpenseAmount = recurringExpense.amount as string;
					const recurringExpenseId = recurringExpense.id as string;
					returnData.push({
						name:
							recurringExpenseName + recurringExpenseAmount ? ` (${recurringExpenseAmount})` : '',
						value: recurringExpenseId,
					});
				}
				return returnData;
			},
			// Get all the available users to display them to user so that he can
			// select them easily
			async getUsersV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const users = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/users');
				for (const user of users) {
					const userName = [[user.first_name, user.last_name].join(' '), user.email]
						.filter((e) => e)
						.join(' - ');
					const userId = user.id as string;
					returnData.push({
						name: userName,
						value: userId,
					});
				}
				return returnData;
			},
			// Get all the available vendors to display them to user so that he can
			// select them easily
			async getVendorsV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const vendors = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/vendors');
				for (const vendor of vendors) {
					const vendorName = vendor.name as string;
					const vendorId = vendor.id as string;
					returnData.push({
						name: vendorName,
						value: vendorId,
					});
				}
				return returnData;
			},
		},
	},

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0);
		if (resource === 'bankTransaction') return BankTransactionExecution.execute.call(this);
		else if (resource === 'client') return ClientExecution.execute.call(this);
		else if (resource === 'credit') return CreditExecution.execute.call(this);
		else if (resource === 'document') return DocumentExecution.execute.call(this);
		else if (resource === 'expense') return ExpenseExecution.execute.call(this);
		else if (resource === 'invoice') return InvoiceExecution.execute.call(this);
		else if (resource === 'payment') return PaymentExecution.execute.call(this);
		else if (resource === 'purchaseOrder') return PurchaseOrderExecution.execute.call(this);
		else if (resource === 'product') return ProductExecution.execute.call(this);
		else if (resource === 'project') return ProjectExecution.execute.call(this);
		else if (resource === 'quote') return QuoteExecution.execute.call(this);
		else if (resource === 'recurringExpense') return RecurringExpenseExecution.execute.call(this);
		else if (resource === 'recurringInvoice') return RecurringInvoiceExecution.execute.call(this);
		else if (resource === 'subscription') return SubscriptionExecution.execute.call(this);
		else if (resource === 'system') return SystemExecution.execute.call(this);
		else if (resource === 'task') return TaskExecution.execute.call(this);
		else if (resource === 'vendor') return VendorExecution.execute.call(this);
		throw new Error('No Execution Handler');
	},
};
