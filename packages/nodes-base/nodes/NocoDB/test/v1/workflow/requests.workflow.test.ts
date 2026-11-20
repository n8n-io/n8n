import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const base = 'p8x2kq9w3m4n5b1';
const table = 'md_m7yq2w4e6r8t0a';
const row = { Id: 12, Title: 'Quarterly report' };
const rows = [row, { Id: 13, Title: 'Annual report' }];

describe('NocoDB Node (v1) - request URLs', () => {
	beforeAll(() => {
		const v1Bulk = `/nc/${base}/api/v1/${table}/bulk`;
		const v2Bulk = `/api/v1/db/data/bulk/noco/${base}/${table}`;
		const v3Records = `/api/v2/tables/${table}/records`;

		nock('https://app.nocodb.com')
			.post(v1Bulk, [{}])
			.reply(200, [5])
			.delete(v1Bulk, [{ id: '12' }])
			.reply(200, [1])
			.get(`/nc/${base}/api/v1/${table}/12`)
			.reply(200, row)
			.get(`/nc/${base}/api/v1/${table}`)
			.query({ limit: 2 })
			.reply(200, rows)
			.put(v1Bulk, [{ id: '12' }])
			.reply(200, [1])
			.post(v2Bulk, [{}])
			.reply(200, [5])
			.delete(v2Bulk, [{ id: '12' }])
			.reply(200, [1])
			.get(`/api/v1/db/data/noco/${base}/${table}/12`)
			.reply(200, row)
			.get(`/api/v1/db/data/noco/${base}/${table}`)
			.query({ limit: 2 })
			.reply(200, { list: rows })
			.patch(v2Bulk, [{ id: '12' }])
			.reply(200, [1])
			.post(v3Records, [{}])
			.reply(200, [{ Id: 5 }])
			.delete(v3Records, [{ id: '12' }])
			.reply(200, [{ Id: 12 }])
			.get(`${v3Records}/12`)
			.reply(200, row)
			.get(v3Records)
			.query({ limit: 2 })
			.reply(200, { list: rows })
			.patch(v3Records, [{}])
			.reply(200, [{ Id: 12 }])
			.get(`${v3Records}/14`)
			.reply(200, {
				Id: 14,
				Files: [
					{
						url: 'https://app.nocodb.com/download/noco/report.pdf',
						signedUrl: 'https://files.example.com/noco/report.pdf?sig=a1b2c3',
						title: 'report.pdf',
						mimetype: 'application/pdf',
						size: 7,
					},
				],
			});

		nock('https://files.example.com')
			.get('/noco/report.pdf')
			.query({ sig: 'a1b2c3' })
			.reply(200, Buffer.from('%PDF-1.'));
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			nocoDbApiToken: { apiToken: 'test-api-token', host: 'https://app.nocodb.com' },
		},
		workflowFiles: ['requests.workflow.json'],
	});
});
