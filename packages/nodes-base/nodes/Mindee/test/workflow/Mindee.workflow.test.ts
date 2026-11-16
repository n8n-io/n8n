import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Mindee > Workflows', () => {
	const credentials = {
		mindeeReceiptApi: { apiKey: 'fake-receipt-key' },
		mindeeInvoiceApi: { apiKey: 'fake-invoice-key' },
	};

	beforeAll(() => {
		const mock = nock('https://api.mindee.net');
		mock
			.post('/products/expense_receipts/v2/predict')
			.reply(200, { document: { id: 'receipt-v1' } });
		mock.post('/products/invoices/v1/predict').reply(200, { document: { id: 'invoice-v1' } });
		mock
			.post('/v1/products/mindee/expense_receipts/v3/predict')
			.reply(200, { document: { id: 'receipt-v3' } });
		mock
			.post('/v1/products/mindee/invoices/v3/predict')
			.reply(200, { document: { id: 'invoice-v3' } });
		mock
			.post('/v1/products/mindee/expense_receipts/v4/predict')
			.reply(200, { document: { id: 'receipt-v4' } });
		mock
			.post('/v1/products/mindee/invoices/v4/predict')
			.reply(200, { document: { id: 'invoice-v4' } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
