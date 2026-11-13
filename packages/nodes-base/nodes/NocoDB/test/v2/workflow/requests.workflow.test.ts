import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const base = 'p8x2kq9w3m4n5b1';
const table = 'm7yq2w4e6r8t0ab';
const records = `/api/v3/data/${base}/${table}/records`;
const links = `/api/v3/data/${base}/${table}/links/c4gzwl1scxmj2i5/12`;
const quarterly = { id: 12, fields: { Title: 'Quarterly report' } };
const attachment = {
	url: 'https://app.nocodb.com/download/noco/report.pdf',
	signedUrl: 'https://files.example.com/noco/report.pdf?sig=a1b2c3',
	title: 'report.pdf',
	mimetype: 'application/pdf',
	size: 7,
};

describe('NocoDB Node - request URLs', () => {
	beforeAll(() => {
		nock('https://app.nocodb.com')
			.get(`${records}/12`)
			.times(2)
			.reply(200, quarterly)
			.get(`${records}/14`)
			.reply(200, { id: 14, fields: { Files: [attachment] } })
			.post(records, [{ fields: {} }])
			.reply(200, { records: [{ id: 13 }] })
			.patch(records, [{ id: '12', fields: {} }])
			.times(2)
			.reply(200, { records: [{ id: 12 }] })
			.delete(records, [{ id: '12' }])
			.reply(200, { records: [{ id: 12 }] })
			.get(`/api/v3/data/${base}/${table}/count`)
			.reply(200, { count: 2 })
			.get(records)
			.query({ limit: 2 })
			.reply(200, {
				records: [quarterly, { id: 13, fields: { Title: 'Annual report' } }],
			})
			.post(`${records}/12/fields/c9fh3k5m7n2p4qa/upload`, {
				contentType: 'text/plain',
				file: 'aGVsbG8=',
				filename: 'note.txt',
			})
			.reply(200, { id: 12 })
			.patch(records, [
				{ id: '12', fields: { c9fh3k5m7n2p4qa: [{ url: 'https://files.example.com/logo.png' }] } },
			])
			.reply(200, { records: [{ id: 12 }] })
			.post(links, [{ id: '21' }])
			.reply(200, { success: true })
			.delete(links, [{ id: '21' }])
			.reply(200, { success: true })
			.get(links)
			.query({ limit: 5 })
			.reply(200, { records: [{ id: 21 }] })
			.get(`/api/v3/meta/bases/${base}`)
			.reply(200, { id: base, title: 'Sales' })
			.get(`/api/v3/meta/bases/${base}/tables`)
			.reply(200, { list: [{ id: table }] })
			.get(`/api/v3/meta/bases/${base}/tables/${table}`)
			.reply(200, { id: table, title: 'Orders' })
			.get('/api/v3/meta/workspaces/wi0qdp7n/bases')
			.reply(200, { list: [{ id: base, title: 'Sales' }] });

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
