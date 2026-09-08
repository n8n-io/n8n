import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';
describe('Test SendGrid Node', () => {
    describe('Mail', () => {
        const sendgridNock = nock('https://api.sendgrid.com/v3')
            .post('/mail/send', (body) => body?.reply_to_list?.[0]?.email === 'test-reply-to@n8n.io')
            .reply(202);
        afterAll(() => sendgridNock.done());
        new NodeTestHarness().setupTests({
            workflowFiles: ['mail.workflow.json'],
        });
    });
});
//# sourceMappingURL=SendGrid.node.test.js.map