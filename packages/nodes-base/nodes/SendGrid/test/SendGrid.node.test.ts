import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { escapeSgqlLikeValue } from '@utils/query-escaping';

describe('Test SendGrid Node', () => {
	describe('Mail', () => {
		const sendgridNock = nock('https://api.sendgrid.com/v3')
			.post(
				'/mail/send',
				(body: { reply_to_list?: [{ email: string }] }) =>
					body?.reply_to_list?.[0]?.email === 'test-reply-to@n8n.io',
			)
			.reply(202);

		afterAll(() => sendgridNock.done());

		new NodeTestHarness().setupTests({
			workflowFiles: ['mail.workflow.json'],
		});
	});

	describe('Contact: get by email', () => {
		let sentQuery: string | undefined;

		const sendgridNock = nock('https://api.sendgrid.com/v3')
			.post('/marketing/contacts/search', (body: { query?: string }) => {
				sentQuery = body.query;
				return true;
			})
			.reply(200, { result: [{ id: 'contact-1', email: 'x@n8n.io' }] });

		afterAll(() => sendgridNock.done());

		new NodeTestHarness().setupTests({
			workflowFiles: ['contact-get-by-email.workflow.json'],
		});

		it('keeps the email inside its SGQL literal', () => {
			expect(sentQuery).toBe("email LIKE 'a\\'b\\'c' ");
		});

		it('keeps a wildcard in the email from widening the lookup', () => {
			expect(escapeSgqlLikeValue('a%b')).toBe('a%%b');
		});
	});
});
