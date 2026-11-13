import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Invoice Ninja', () => {
	const credentials = {
		invoiceNinjaApi: { url: 'https://invoicing.example.com', apiToken: 'fake-api-token' },
	};

	const client = { id: 'VolejRejNm', name: 'Acme Corp' };
	const invoice = { id: 'Wpmbk5ezJn', number: '0001', client_id: 'VolejRejNm' };
	const task = { id: 'Opnel5aKBz', description: 'Design review' };
	const payment = { id: 'xYRdG7dDzO', amount: 100 };
	const expense = { id: 'k8mep2bMyJ', amount: 25 };
	const bankTransaction = { id: 'gl9avmeG1v', amount: 100 };
	const quote = { id: 'zDnB4gaoXK', number: 'Q-0001' };
	const emailSent = { message: 'Email sent' };

	beforeAll(() => {
		const api = nock('https://invoicing.example.com/api/v1');

		api.post('/clients', { name: 'Acme Corp' }).reply(200, { data: client });
		api.get('/clients/VolejRejNm').reply(200, { data: client });
		api
			.get('/clients')
			.query({ per_page: 5 })
			.reply(200, { data: [client] });
		api
			.get('/clients')
			.query({ per_page: 100 })
			.reply(200, {
				data: [client],
				meta: {
					pagination: {
						links: { next: 'https://invoicing.example.com/api/v1/clients?page=2' },
					},
				},
			});
		api
			.get('/clients')
			.query({ page: 2, per_page: 100 })
			.reply(200, {
				data: [{ id: 'MpmbkGezJn', name: 'Globex' }],
				meta: { pagination: { links: {} } },
			});
		api.delete('/clients/VolejRejNm').reply(200, { data: client });

		api.post('/invoices').reply(200, { data: invoice });
		api.get('/invoices/Wpmbk5ezJn/email').reply(200, emailSent);
		api.get('/invoices/Wpmbk5ezJn').reply(200, { data: invoice });
		api
			.get('/invoices')
			.query({ per_page: 5 })
			.reply(200, { data: [invoice] });
		api.delete('/invoices/Wpmbk5ezJn').reply(200, { data: invoice });

		api.post('/tasks', { description: 'Design review' }).reply(200, { data: task });
		api.get('/tasks/Opnel5aKBz').reply(200, { data: task });
		api
			.get('/tasks')
			.query({ per_page: 5 })
			.reply(200, { data: [task] });
		api.delete('/tasks/Opnel5aKBz').reply(200, { data: task });

		api.get('/invoices/Wpmbk5ezJn').reply(200, { data: invoice });
		api
			.post('/payments', {
				amount: 100,
				client_id: 'VolejRejNm',
				invoices: [{ invoice_id: 'Wpmbk5ezJn', amount: 100 }],
			})
			.reply(200, { data: payment });
		api.get('/payments/xYRdG7dDzO').reply(200, { data: payment });
		api
			.get('/payments')
			.query({ per_page: 5 })
			.reply(200, { data: [payment] });
		api.delete('/payments/xYRdG7dDzO').reply(200, { data: payment });

		api.post('/expenses', { amount: 25 }).reply(200, { data: expense });
		api.get('/expenses/k8mep2bMyJ').reply(200, { data: expense });
		api
			.get('/expenses')
			.query({ per_page: 5 })
			.reply(200, { data: [expense] });
		api.delete('/expenses/k8mep2bMyJ').reply(200, { data: expense });

		api.post('/bank_transactions', { amount: 100 }).reply(200, { data: bankTransaction });
		api.delete('/bank_transactions/gl9avmeG1v').reply(200, { data: bankTransaction });
		api
			.post('/bank_transactions/match', {
				transactions: [{ id: 'gl9avmeG1v', payment_id: 'xYRdG7dDzO' }],
			})
			.reply(200, { data: [bankTransaction] });

		api.post('/quotes', { is_quote: true }).reply(200, { data: quote });
		api.get('/quotes/zDnB4gaoXK/email').reply(200, emailSent);
		api.get('/quotes/zDnB4gaoXK').reply(200, { data: quote });
		api
			.get('/quotes')
			.query({ per_page: 5 })
			.reply(200, { data: [quote] });
		api.delete('/quotes/zDnB4gaoXK').reply(200, { data: quote });

		api.get('/invoices/17').reply(200, { data: { id: 17, is_quote: true } });
		api.post('/email_invoice', { id: '12' }).reply(200, emailSent);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
