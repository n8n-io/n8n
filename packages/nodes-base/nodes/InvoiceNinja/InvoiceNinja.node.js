import { NodeConnectionTypes } from 'n8n-workflow';
import { isoCountryCodes } from '@utils/ISOCountryCodes';
import { bankTransactionFields, bankTransactionOperations } from './BankTransactionDescription';
import { clientFields, clientOperations } from './ClientDescription';
import { expenseFields, expenseOperations } from './ExpenseDescription';
import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from './GenericFunctions';
import { invoiceFields, invoiceOperations } from './InvoiceDescription';
import { paymentFields, paymentOperations } from './PaymentDescription';
import { quoteFields, quoteOperations } from './QuoteDescription';
import { taskFields, taskOperations } from './TaskDescription';
export class InvoiceNinja {
    description = {
        displayName: 'Invoice Ninja',
        name: 'invoiceNinja',
        icon: 'file:invoiceNinja.svg',
        group: ['output'],
        version: [1, 2],
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Invoice Ninja API',
        defaults: {
            name: 'Invoice Ninja',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'invoiceNinjaApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'API Version',
                name: 'apiVersion',
                type: 'options',
                isNodeSetting: true,
                displayOptions: {
                    show: {
                        '@version': [1],
                    },
                },
                options: [
                    {
                        name: 'Version 4',
                        value: 'v4',
                    },
                    {
                        name: 'Version 5',
                        value: 'v5',
                    },
                ],
                default: 'v4',
            },
            {
                displayName: 'API Version',
                name: 'apiVersion',
                type: 'options',
                isNodeSetting: true,
                displayOptions: {
                    show: {
                        '@version': [2],
                    },
                },
                options: [
                    {
                        name: 'Version 4',
                        value: 'v4',
                    },
                    {
                        name: 'Version 5',
                        value: 'v5',
                    },
                ],
                default: 'v5',
            },
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Bank Transaction',
                        value: 'bank_transaction',
                        displayOptions: {
                            show: {
                                apiVersion: ['v5'],
                            },
                        },
                    },
                    {
                        name: 'Client',
                        value: 'client',
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
                        name: 'Quote',
                        value: 'quote',
                    },
                    {
                        name: 'Task',
                        value: 'task',
                    },
                ],
                default: 'client',
            },
            ...clientOperations,
            ...clientFields,
            ...invoiceOperations,
            ...invoiceFields,
            ...taskOperations,
            ...taskFields,
            ...paymentOperations,
            ...paymentFields,
            ...expenseOperations,
            ...expenseFields,
            ...quoteOperations,
            ...quoteFields,
            ...bankTransactionOperations,
            ...bankTransactionFields,
        ],
    };
    methods = {
        loadOptions: {
            // Get all the available clients to display them to user so that they can
            // select them easily
            async getClients() {
                const returnData = [];
                const clients = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/clients');
                for (const client of clients) {
                    const clientName = client.display_name;
                    const clientId = client.id;
                    returnData.push({
                        name: clientName,
                        value: clientId,
                    });
                }
                return returnData;
            },
            // Get all the available projects to display them to user so that they can
            // select them easily
            async getProjects() {
                const returnData = [];
                const projects = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/projects');
                for (const project of projects) {
                    const projectName = project.name;
                    const projectId = project.id;
                    returnData.push({
                        name: projectName,
                        value: projectId,
                    });
                }
                return returnData;
            },
            // Get all the available invoices to display them to user so that they can
            // select them easily
            async getInvoices() {
                const returnData = [];
                const invoices = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/invoices');
                for (const invoice of invoices) {
                    const invoiceName = (invoice.invoice_number || invoice.number);
                    const invoiceId = invoice.id;
                    returnData.push({
                        name: invoiceName,
                        value: invoiceId,
                    });
                }
                return returnData;
            },
            // Get all the available country codes to display them to user so that they can
            // select them easily
            async getCountryCodes() {
                const returnData = [];
                for (let i = 0; i < isoCountryCodes.length; i++) {
                    const countryName = isoCountryCodes[i].name;
                    const countryId = isoCountryCodes[i].numeric;
                    returnData.push({
                        name: countryName,
                        value: countryId,
                    });
                }
                return returnData;
            },
            // Get all the available vendors to display them to user so that they can
            // select them easily
            async getVendors() {
                const returnData = [];
                const vendors = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/vendors');
                for (const vendor of vendors) {
                    const vendorName = vendor.name;
                    const vendorId = vendor.id;
                    returnData.push({
                        name: vendorName,
                        value: vendorId,
                    });
                }
                return returnData;
            },
            // Get all the available expense categories to display them to user so that they can
            // select them easily
            async getExpenseCategories() {
                const returnData = [];
                const categories = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/expense_categories');
                for (const category of categories) {
                    const categoryName = category.name;
                    const categoryId = category.id;
                    returnData.push({
                        name: categoryName,
                        value: categoryId,
                    });
                }
                return returnData;
            },
            // Get all the available bank integrations to display them to user so that they can
            // select them easily
            async getBankIntegrations() {
                const returnData = [];
                let banks = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/bank_integrations');
                banks = banks.filter((e) => !e.is_deleted);
                for (const bank of banks) {
                    const providerName = bank.provider_name;
                    const accountName = bank.bank_account_name;
                    const bankId = bank.id;
                    returnData.push({
                        name: providerName != accountName
                            ? `${providerName} - ${accountName}`
                            : accountName || providerName,
                        value: bankId,
                    });
                }
                return returnData;
            },
            // Get all the matchable payments to display them to user so that they can
            // select them easily
            async getPayments() {
                const returnData = [];
                const qs = {};
                // Only select payments that can be matched to transactions
                qs.match_transactions = true;
                const payments = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/payments', {}, qs);
                for (const payment of payments) {
                    const paymentName = [payment.number, payment.date, payment.amount]
                        .filter((e) => e)
                        .join(' - ');
                    const paymentId = payment.id;
                    returnData.push({
                        name: paymentName,
                        value: paymentId,
                    });
                }
                return returnData;
            },
            // Get all the currencies to display them to user so that they can
            // select them easily
            async getCurrencies() {
                const returnData = [];
                const statics = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/statics');
                Object.entries(statics)
                    .filter(([key]) => key === 'currencies')
                    .forEach(([key, value]) => {
                    if (key === 'currencies' && Array.isArray(value)) {
                        for (const currency of value) {
                            const currencyName = [currency.number, currency.code].filter((e) => e).join(' - ');
                            const currencyId = currency.id;
                            returnData.push({
                                name: currencyName,
                                value: currencyId,
                            });
                        }
                    }
                });
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        const qs = {};
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        const apiVersion = this.getNodeParameter('apiVersion', 0);
        for (let i = 0; i < length; i++) {
            //Routes: https://github.com/invoiceninja/invoiceninja/blob/ff455c8ed9fd0c0326956175ecd509efa8bad263/routes/api.php
            try {
                if (resource === 'client') {
                    if (operation === 'create') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {};
                        if (additionalFields.clientName) {
                            body.name = additionalFields.clientName;
                        }
                        if (additionalFields.clientName) {
                            body.name = additionalFields.clientName;
                        }
                        if (additionalFields.idNumber) {
                            body.id_number = additionalFields.idNumber;
                        }
                        if (additionalFields.idNumber) {
                            body.id_number = additionalFields.idNumber;
                        }
                        if (additionalFields.privateNotes) {
                            body.private_notes = additionalFields.privateNotes;
                        }
                        if (additionalFields.vatNumber) {
                            body.vat_number = additionalFields.vatNumber;
                        }
                        if (additionalFields.workPhone) {
                            body.work_phone = additionalFields.workPhone;
                        }
                        if (additionalFields.website) {
                            body.website = additionalFields.website;
                        }
                        const contactsValues = this.getNodeParameter('contactsUi', i)
                            .contacstValues;
                        if (contactsValues) {
                            const contacts = [];
                            for (const contactValue of contactsValues) {
                                const contact = {
                                    first_name: contactValue.firstName,
                                    last_name: contactValue.lastName,
                                    email: contactValue.email,
                                    phone: contactValue.phone,
                                };
                                contacts.push(contact);
                            }
                            body.contacts = contacts;
                        }
                        const shippingAddressValue = this.getNodeParameter('shippingAddressUi', i).shippingAddressValue;
                        if (shippingAddressValue) {
                            body.shipping_address1 = shippingAddressValue.streetAddress;
                            body.shipping_address2 = shippingAddressValue.aptSuite;
                            body.shipping_city = shippingAddressValue.city;
                            body.shipping_state = shippingAddressValue.state;
                            body.shipping_postal_code = shippingAddressValue.postalCode;
                            body.shipping_country_id = parseInt(shippingAddressValue.countryCode, 10);
                        }
                        const billingAddressValue = this.getNodeParameter('billingAddressUi', i).billingAddressValue;
                        if (billingAddressValue) {
                            body.address1 = billingAddressValue.streetAddress;
                            body.address2 = billingAddressValue.aptSuite;
                            body.city = billingAddressValue.city;
                            body.state = billingAddressValue.state;
                            body.postal_code = billingAddressValue.postalCode;
                            body.country_id = parseInt(billingAddressValue.countryCode, 10);
                        }
                        responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/clients', body);
                        responseData = responseData.data;
                    }
                    if (operation === 'get') {
                        const clientId = this.getNodeParameter('clientId', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.include) {
                            qs.include = options.include;
                        }
                        responseData = await invoiceNinjaApiRequest.call(this, 'GET', `/clients/${clientId}`, {}, qs);
                        responseData = responseData.data;
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        const options = this.getNodeParameter('options', i);
                        if (options.include) {
                            qs.include = options.include;
                        }
                        if (options.status) {
                            qs.status = options.status;
                        }
                        if (options.createdAt) {
                            qs.created_at = options.createdAt;
                        }
                        if (options.updatedAt) {
                            qs.updated_at = options.updatedAt;
                        }
                        if (options.isDeleted) {
                            qs.is_deleted = options.isDeleted;
                        }
                        if (returnAll) {
                            responseData = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/clients', {}, qs);
                        }
                        else {
                            qs.per_page = this.getNodeParameter('limit', 0);
                            responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/clients', {}, qs);
                            responseData = responseData.data;
                        }
                    }
                    if (operation === 'delete') {
                        const clientId = this.getNodeParameter('clientId', i);
                        responseData = await invoiceNinjaApiRequest.call(this, 'DELETE', `/clients/${clientId}`);
                        responseData = responseData.data;
                    }
                }
                if (resource === 'invoice') {
                    if (operation === 'create') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {};
                        if (additionalFields.email) {
                            body.email = additionalFields.email;
                        }
                        if (additionalFields.client) {
                            body.client_id = additionalFields.client;
                        }
                        if (additionalFields.autoBill) {
                            body.auto_bill = additionalFields.autoBill;
                        }
                        if (additionalFields.customValue1) {
                            body.custom_value1 = additionalFields.customValue1;
                        }
                        if (additionalFields.customValue2) {
                            body.custom_value2 = additionalFields.customValue2;
                        }
                        if (additionalFields.dueDate) {
                            body.due_date = additionalFields.dueDate;
                        }
                        if (additionalFields.invoiceDate) {
                            body.invoice_date = additionalFields.invoiceDate;
                        }
                        if (additionalFields.invoiceNumber) {
                            if (apiVersion === 'v4') {
                                body.invoice_number = additionalFields.invoiceNumber;
                            }
                            else if (apiVersion === 'v5') {
                                body.number = additionalFields.invoiceNumber;
                            }
                        }
                        if (additionalFields.invoiceStatus) {
                            body.invoice_status_id = additionalFields.invoiceStatus;
                        }
                        if (additionalFields.isAmountDiscount) {
                            body.is_amount_discount = additionalFields.isAmountDiscount;
                        }
                        if (additionalFields.partial) {
                            body.partial = additionalFields.partial;
                        }
                        if (additionalFields.partialDueDate) {
                            body.partial_due_date = additionalFields.partialDueDate;
                        }
                        if (additionalFields.poNumber) {
                            body.po_number = additionalFields.poNumber;
                        }
                        if (additionalFields.privateNotes) {
                            body.private_notes = additionalFields.privateNotes;
                        }
                        if (additionalFields.publicNotes) {
                            body.public_notes = additionalFields.publicNotes;
                        }
                        if (additionalFields.taxName1) {
                            body.tax_name1 = additionalFields.taxName1;
                        }
                        if (additionalFields.taxName2) {
                            body.tax_name2 = additionalFields.taxName2;
                        }
                        if (additionalFields.taxRate1) {
                            body.tax_rate1 = additionalFields.taxRate1;
                        }
                        if (additionalFields.taxRate2) {
                            body.tax_rate2 = additionalFields.taxRate2;
                        }
                        if (additionalFields.discount) {
                            body.discount = additionalFields.discount;
                        }
                        if (additionalFields.paid) {
                            if (apiVersion === 'v4') {
                                body.paid = additionalFields.paid;
                            }
                            else if (apiVersion === 'v5') {
                                qs.amount_paid = additionalFields.paid;
                            }
                        }
                        if (additionalFields.emailInvoice) {
                            if (apiVersion === 'v4') {
                                body.email_invoice = additionalFields.emailInvoice;
                            }
                            else if (apiVersion === 'v5') {
                                qs.send_email = additionalFields.emailInvoice;
                            }
                        }
                        if (additionalFields.markSent) {
                            qs.mark_sent = additionalFields.markSent;
                        }
                        const invoiceItemsValues = this.getNodeParameter('invoiceItemsUi', i)
                            .invoiceItemsValues;
                        if (invoiceItemsValues) {
                            const invoiceItems = [];
                            for (const itemValue of invoiceItemsValues) {
                                const item = {
                                    cost: itemValue.cost,
                                    notes: itemValue.description,
                                    product_key: itemValue.service,
                                    tax_rate1: itemValue.taxRate1,
                                    tax_rate2: itemValue.taxRate2,
                                    tax_name1: itemValue.taxName1,
                                    tax_name2: itemValue.taxName2,
                                };
                                if (apiVersion === 'v4') {
                                    item.qty = itemValue.hours;
                                }
                                if (apiVersion === 'v5') {
                                    item.quantity = itemValue.hours;
                                }
                                invoiceItems.push(item);
                            }
                            if (apiVersion === 'v4') {
                                body.invoice_items = invoiceItems;
                            }
                            if (apiVersion === 'v5') {
                                body.line_items = invoiceItems;
                            }
                        }
                        responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/invoices', body, qs);
                        responseData = responseData.data;
                    }
                    if (operation === 'email') {
                        const invoiceId = this.getNodeParameter('invoiceId', i);
                        if (apiVersion === 'v4') {
                            responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/email_invoice', {
                                id: invoiceId,
                            });
                        }
                        if (apiVersion === 'v5') {
                            responseData = await invoiceNinjaApiRequest.call(this, 'GET', `/invoices/${invoiceId}/email`);
                        }
                    }
                    if (operation === 'get') {
                        const invoiceId = this.getNodeParameter('invoiceId', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.include) {
                            qs.include = options.include;
                        }
                        responseData = await invoiceNinjaApiRequest.call(this, 'GET', `/invoices/${invoiceId}`, {}, qs);
                        responseData = responseData.data;
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        const options = this.getNodeParameter('options', i);
                        if (options.include) {
                            qs.include = options.include;
                        }
                        if (options.invoiceNumber) {
                            if (apiVersion === 'v4') {
                                qs.invoice_number = options.invoiceNumber;
                            }
                            else if (apiVersion === 'v5') {
                                // eslint-disable-next-line id-denylist
                                qs.number = options.invoiceNumber;
                            }
                        }
                        if (options.status) {
                            qs.status = options.status;
                        }
                        if (options.createdAt) {
                            qs.created_at = options.createdAt;
                        }
                        if (options.updatedAt) {
                            qs.updated_at = options.updatedAt;
                        }
                        if (options.isDeleted) {
                            qs.is_deleted = options.isDeleted;
                        }
                        if (options.clientStatus) {
                            qs.client_status = options.clientStatus;
                        }
                        if (returnAll) {
                            responseData = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/invoices', {}, qs);
                        }
                        else {
                            qs.per_page = this.getNodeParameter('limit', 0);
                            responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/invoices', {}, qs);
                            responseData = responseData.data;
                        }
                    }
                    if (operation === 'delete') {
                        const invoiceId = this.getNodeParameter('invoiceId', i);
                        responseData = await invoiceNinjaApiRequest.call(this, 'DELETE', `/invoices/${invoiceId}`);
                        responseData = responseData.data;
                    }
                }
                if (resource === 'task') {
                    if (operation === 'create') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {};
                        if (additionalFields.client) {
                            body.client_id = additionalFields.client;
                        }
                        if (additionalFields.project) {
                            body.project_id = additionalFields.project;
                        }
                        if (additionalFields.customValue1) {
                            body.custom_value1 = additionalFields.customValue1;
                        }
                        if (additionalFields.customValue2) {
                            body.custom_value2 = additionalFields.customValue2;
                        }
                        if (additionalFields.description) {
                            body.description = additionalFields.description;
                        }
                        const timeLogsValues = this.getNodeParameter('timeLogsUi', i)
                            .timeLogsValues;
                        if (timeLogsValues) {
                            const logs = [];
                            for (const logValue of timeLogsValues) {
                                let from = 0, to;
                                if (logValue.startDate) {
                                    from = new Date(logValue.startDate).getTime() / 1000;
                                }
                                if (logValue.endDate) {
                                    to = new Date(logValue.endDate).getTime() / 1000;
                                }
                                if (logValue.duration) {
                                    to = from + logValue.duration * 3600;
                                }
                                logs.push([from, to]);
                            }
                            body.time_log = JSON.stringify(logs);
                        }
                        responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/tasks', body);
                        responseData = responseData.data;
                    }
                    if (operation === 'get') {
                        const taskId = this.getNodeParameter('taskId', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.include) {
                            qs.include = options.include;
                        }
                        responseData = await invoiceNinjaApiRequest.call(this, 'GET', `/tasks/${taskId}`, {}, qs);
                        responseData = responseData.data;
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        const options = this.getNodeParameter('options', i);
                        if (options.include) {
                            qs.include = options.include;
                        }
                        if (returnAll) {
                            responseData = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/tasks', {}, qs);
                        }
                        else {
                            qs.per_page = this.getNodeParameter('limit', 0);
                            responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/tasks', {}, qs);
                            responseData = responseData.data;
                        }
                    }
                    if (operation === 'delete') {
                        const taskId = this.getNodeParameter('taskId', i);
                        responseData = await invoiceNinjaApiRequest.call(this, 'DELETE', `/tasks/${taskId}`);
                        responseData = responseData.data;
                    }
                }
                if (resource === 'payment') {
                    if (operation === 'create') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const invoice = this.getNodeParameter('invoice', i);
                        const client = (await invoiceNinjaApiRequest.call(this, 'GET', `/invoices/${invoice}`, {}, qs)).data?.client_id;
                        const amount = this.getNodeParameter('amount', i);
                        const body = {
                            amount,
                            client_id: client,
                        };
                        if (apiVersion === 'v4') {
                            body.invoice_id = invoice;
                        }
                        else if (apiVersion === 'v5') {
                            body.invoices = [
                                {
                                    invoice_id: invoice,
                                    amount,
                                },
                            ];
                        }
                        if (additionalFields.paymentType) {
                            if (apiVersion === 'v4') {
                                body.payment_type_id = additionalFields.paymentType;
                            }
                            else if (apiVersion == 'v5') {
                                body.type_id = additionalFields.paymentType;
                            }
                        }
                        if (additionalFields.transferReference) {
                            body.transaction_reference = additionalFields.transferReference;
                        }
                        if (additionalFields.privateNotes) {
                            body.private_notes = additionalFields.privateNotes;
                        }
                        responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/payments', body);
                        responseData = responseData.data;
                    }
                    if (operation === 'get') {
                        const paymentId = this.getNodeParameter('paymentId', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.include) {
                            qs.include = options.include;
                        }
                        responseData = await invoiceNinjaApiRequest.call(this, 'GET', `/payments/${paymentId}`, {}, qs);
                        responseData = responseData.data;
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        const options = this.getNodeParameter('options', i);
                        if (options.include) {
                            qs.include = options.include;
                        }
                        if (options.status) {
                            qs.status = options.status;
                        }
                        if (options.createdAt) {
                            qs.created_at = options.createdAt;
                        }
                        if (options.updatedAt) {
                            qs.updated_at = options.updatedAt;
                        }
                        if (options.isDeleted) {
                            qs.is_deleted = options.isDeleted;
                        }
                        if (returnAll) {
                            responseData = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/payments', {}, qs);
                        }
                        else {
                            qs.per_page = this.getNodeParameter('limit', 0);
                            responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/payments', {}, qs);
                            responseData = responseData.data;
                        }
                    }
                    if (operation === 'delete') {
                        const paymentId = this.getNodeParameter('paymentId', i);
                        responseData = await invoiceNinjaApiRequest.call(this, 'DELETE', `/payments/${paymentId}`);
                        responseData = responseData.data;
                    }
                }
                if (resource === 'expense') {
                    if (operation === 'create') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {};
                        if (additionalFields.amount) {
                            body.amount = additionalFields.amount;
                        }
                        if (additionalFields.billable) {
                            body.should_be_invoiced = additionalFields.billable;
                        }
                        if (additionalFields.client) {
                            body.client_id = additionalFields.client;
                        }
                        if (additionalFields.customValue1) {
                            body.custom_value1 = additionalFields.customValue1;
                        }
                        if (additionalFields.customValue2) {
                            body.custom_value2 = additionalFields.customValue2;
                        }
                        if (additionalFields.category) {
                            body.expense_category_id = additionalFields.category;
                        }
                        if (additionalFields.expenseDate) {
                            body.expense_date = additionalFields.expenseDate;
                        }
                        if (additionalFields.paymentDate) {
                            body.payment_date = additionalFields.paymentDate;
                        }
                        if (additionalFields.paymentType) {
                            body.payment_type_id = additionalFields.paymentType;
                        }
                        if (additionalFields.publicNotes) {
                            body.public_notes = additionalFields.publicNotes;
                        }
                        if (additionalFields.privateNotes) {
                            body.private_notes = additionalFields.privateNotes;
                        }
                        if (additionalFields.taxName1) {
                            body.tax_name1 = additionalFields.taxName1;
                        }
                        if (additionalFields.taxName2) {
                            body.tax_name2 = additionalFields.taxName2;
                        }
                        if (additionalFields.taxRate1) {
                            body.tax_rate1 = additionalFields.taxRate1;
                        }
                        if (additionalFields.taxRate2) {
                            body.tax_rate2 = additionalFields.taxRate2;
                        }
                        if (additionalFields.transactionReference) {
                            body.transaction_reference = additionalFields.transactionReference;
                        }
                        if (additionalFields.vendor) {
                            body.vendor_id = additionalFields.vendor;
                        }
                        responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/expenses', body);
                        responseData = responseData.data;
                    }
                    if (operation === 'get') {
                        const expenseId = this.getNodeParameter('expenseId', i);
                        responseData = await invoiceNinjaApiRequest.call(this, 'GET', `/expenses/${expenseId}`, {}, qs);
                        responseData = responseData.data;
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        if (returnAll) {
                            responseData = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/expenses', {}, qs);
                        }
                        else {
                            qs.per_page = this.getNodeParameter('limit', 0);
                            responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/expenses', {}, qs);
                            responseData = responseData.data;
                        }
                    }
                    if (operation === 'delete') {
                        const expenseId = this.getNodeParameter('expenseId', i);
                        responseData = await invoiceNinjaApiRequest.call(this, 'DELETE', `/expenses/${expenseId}`);
                        responseData = responseData.data;
                    }
                }
                if (resource === 'bank_transaction') {
                    const resourceEndpoint = '/bank_transactions';
                    if (operation === 'create') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {};
                        if (additionalFields.amount) {
                            body.amount = additionalFields.amount;
                        }
                        if (additionalFields.baseType) {
                            body.base_type = additionalFields.baseType;
                        }
                        if (additionalFields.bankIntegrationId) {
                            body.bank_integration_id = additionalFields.bankIntegrationId;
                        }
                        if (additionalFields.client) {
                            body.date = additionalFields.date;
                        }
                        if (additionalFields.currencyId) {
                            body.currency_id = additionalFields.currencyId;
                        }
                        if (additionalFields.email) {
                            body.description = additionalFields.description;
                        }
                        responseData = await invoiceNinjaApiRequest.call(this, 'POST', resourceEndpoint, body);
                        responseData = responseData.data;
                    }
                    if (operation === 'get') {
                        const bankTransactionId = this.getNodeParameter('bankTransactionId', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.include) {
                            qs.include = options.include;
                        }
                        responseData = await invoiceNinjaApiRequest.call(this, 'GET', `${resourceEndpoint}/${bankTransactionId}`, {}, qs);
                        responseData = responseData.data;
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        const options = this.getNodeParameter('options', i);
                        if (options.include) {
                            qs.include = options.include;
                        }
                        if (options.invoiceNumber) {
                            qs.invoice_number = options.invoiceNumber;
                        }
                        if (returnAll) {
                            responseData = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', resourceEndpoint, {}, qs);
                        }
                        else {
                            qs.per_page = this.getNodeParameter('limit', 0);
                            responseData = await invoiceNinjaApiRequest.call(this, 'GET', resourceEndpoint, {}, qs);
                            responseData = responseData.data;
                        }
                    }
                    if (operation === 'delete') {
                        const bankTransactionId = this.getNodeParameter('bankTransactionId', i);
                        responseData = await invoiceNinjaApiRequest.call(this, 'DELETE', `${resourceEndpoint}/${bankTransactionId}`);
                        responseData = responseData.data;
                    }
                    if (operation === 'matchPayment') {
                        const bankTransactionId = this.getNodeParameter('bankTransactionId', i);
                        const paymentId = this.getNodeParameter('paymentId', i);
                        const body = { transactions: [] };
                        const bankTransaction = {};
                        if (bankTransactionId) {
                            bankTransaction.id = bankTransactionId;
                        }
                        if (paymentId) {
                            bankTransaction.payment_id = paymentId;
                        }
                        body.transactions.push(bankTransaction);
                        responseData = await invoiceNinjaApiRequest.call(this, 'POST', `${resourceEndpoint}/match`, body);
                    }
                }
                if (resource === 'quote') {
                    const resourceEndpoint = apiVersion === 'v4' ? '/invoices' : '/quotes';
                    if (operation === 'create') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            is_quote: true,
                        };
                        if (additionalFields.client) {
                            body.client_id = additionalFields.client;
                        }
                        if (additionalFields.email) {
                            body.email = additionalFields.email;
                        }
                        if (additionalFields.autoBill) {
                            body.auto_bill = additionalFields.autoBill;
                        }
                        if (additionalFields.customValue1) {
                            body.custom_value1 = additionalFields.customValue1;
                        }
                        if (additionalFields.customValue2) {
                            body.custom_value2 = additionalFields.customValue2;
                        }
                        if (additionalFields.dueDate) {
                            body.due_date = additionalFields.dueDate;
                        }
                        if (additionalFields.quoteDate) {
                            body.invoice_date = additionalFields.quoteDate;
                        }
                        if (additionalFields.quoteNumber) {
                            if (apiVersion === 'v4') {
                                body.invoice_number = additionalFields.quoteNumber;
                            }
                            else if (apiVersion === 'v5') {
                                body.number = additionalFields.quoteNumber;
                            }
                        }
                        if (additionalFields.invoiceStatus) {
                            body.invoice_status_id = additionalFields.invoiceStatus;
                        }
                        if (additionalFields.isAmountDiscount) {
                            body.is_amount_discount = additionalFields.isAmountDiscount;
                        }
                        if (additionalFields.partial) {
                            body.partial = additionalFields.partial;
                        }
                        if (additionalFields.partialDueDate) {
                            body.partial_due_date = additionalFields.partialDueDate;
                        }
                        if (additionalFields.poNumber) {
                            body.po_number = additionalFields.poNumber;
                        }
                        if (additionalFields.privateNotes) {
                            body.private_notes = additionalFields.privateNotes;
                        }
                        if (additionalFields.publicNotes) {
                            body.public_notes = additionalFields.publicNotes;
                        }
                        if (additionalFields.taxName1) {
                            body.tax_name1 = additionalFields.taxName1;
                        }
                        if (additionalFields.taxName2) {
                            body.tax_name2 = additionalFields.taxName2;
                        }
                        if (additionalFields.taxRate1) {
                            body.tax_rate1 = additionalFields.taxRate1;
                        }
                        if (additionalFields.taxRate2) {
                            body.tax_rate2 = additionalFields.taxRate2;
                        }
                        if (additionalFields.discount) {
                            body.discount = additionalFields.discount;
                        }
                        if (additionalFields.paid) {
                            body.paid = additionalFields.paid;
                        }
                        if (additionalFields.emailQuote) {
                            body.email_invoice = additionalFields.emailQuote;
                        }
                        const invoiceItemsValues = this.getNodeParameter('invoiceItemsUi', i)
                            .invoiceItemsValues;
                        if (invoiceItemsValues) {
                            const invoiceItems = [];
                            for (const itemValue of invoiceItemsValues) {
                                const item = {
                                    cost: itemValue.cost,
                                    notes: itemValue.description,
                                    product_key: itemValue.service,
                                    tax_rate1: itemValue.taxRate1,
                                    tax_rate2: itemValue.taxRate2,
                                    tax_name1: itemValue.taxName1,
                                    tax_name2: itemValue.taxName2,
                                };
                                if (apiVersion === 'v4') {
                                    item.qty = itemValue.hours;
                                }
                                if (apiVersion === 'v5') {
                                    item.quantity = itemValue.hours;
                                }
                                invoiceItems.push(item);
                            }
                            if (apiVersion === 'v4') {
                                body.invoice_items = invoiceItems;
                            }
                            if (apiVersion === 'v5') {
                                body.line_items = invoiceItems;
                            }
                        }
                        responseData = await invoiceNinjaApiRequest.call(this, 'POST', resourceEndpoint, body);
                        responseData = responseData.data;
                    }
                    if (operation === 'email') {
                        const quoteId = this.getNodeParameter('quoteId', i);
                        if (apiVersion === 'v4') {
                            responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/email_invoice', {
                                id: quoteId,
                            });
                        }
                        if (apiVersion === 'v5') {
                            responseData = await invoiceNinjaApiRequest.call(this, 'GET', `${resourceEndpoint}/${quoteId}/email`);
                        }
                    }
                    if (operation === 'get') {
                        const quoteId = this.getNodeParameter('quoteId', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.include) {
                            qs.include = options.include;
                        }
                        responseData = await invoiceNinjaApiRequest.call(this, 'GET', `${resourceEndpoint}/${quoteId}`, {}, qs);
                        responseData = responseData.data;
                    }
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        const options = this.getNodeParameter('options', i);
                        if (options.include) {
                            qs.include = options.include;
                        }
                        if (options.invoiceNumber) {
                            qs.invoice_number = options.invoiceNumber;
                        }
                        if (options.status) {
                            qs.status = options.status;
                        }
                        if (options.createdAt) {
                            qs.created_at = options.createdAt;
                        }
                        if (options.updatedAt) {
                            qs.updated_at = options.updatedAt;
                        }
                        if (options.isDeleted) {
                            qs.is_deleted = options.isDeleted;
                        }
                        if (returnAll) {
                            responseData = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', resourceEndpoint, {}, qs);
                        }
                        else {
                            qs.per_page = this.getNodeParameter('limit', 0);
                            responseData = await invoiceNinjaApiRequest.call(this, 'GET', resourceEndpoint, {}, qs);
                            responseData = responseData.data;
                        }
                    }
                    if (operation === 'delete') {
                        const quoteId = this.getNodeParameter('quoteId', i);
                        responseData = await invoiceNinjaApiRequest.call(this, 'DELETE', `${resourceEndpoint}/${quoteId}`);
                        responseData = responseData.data;
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionErrorData);
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=InvoiceNinja.node.js.map