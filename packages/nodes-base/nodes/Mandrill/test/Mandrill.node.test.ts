import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock, mockDeep } from 'jest-mock-extended';
import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import nock from 'nock';

import { Mandrill } from '../Mandrill.node';

describe('Test Mandrill Node', () => {
	describe('Messages', () => {
		const mandrillNock = nock('https://mandrillapp.com/api/1.0');

		beforeAll(() => {
			// Mock sendTemplate API call with subaccount verification
			mandrillNock
				.post('/messages/send-template.json', (body) => {
					// Verify that subaccount is properly passed to the API
					return (
						body.message &&
						body.message.subaccount === 'test-subaccount' &&
						body.template_name === 'test-template'
					);
				})
				.reply(200, [
					{
						email: 'recipient@example.com',
						status: 'sent',
						reject_reason: null,
						_id: 'test-message-id-456',
					},
				]);

			// Mock sendTemplate API call specifically for subaccount regression test
			mandrillNock
				.post('/messages/send-template.json', (body) => {
					// Verify regression test scenario: subaccount is properly passed
					return (
						body.message &&
						body.message.subaccount === 'regression-test-subaccount' &&
						body.template_name === 'test-template-subaccount'
					);
				})
				.reply(200, [
					{
						email: 'recipient@example.com',
						status: 'sent',
						reject_reason: null,
						_id: 'test-subaccount-message-id',
					},
				]);

			// Mock sendHtml API call
			mandrillNock.post('/messages/send.json').reply(200, [
				{
					email: 'recipient@example.com',
					status: 'rejected',
					_id: 'test-message-id-123',
					reject_reason: 'global-block',
					queued_reason: null,
				},
			]);
		});

		afterAll(() => mandrillNock.done());

		new NodeTestHarness().setupTests({
			workflowFiles: [
				'sendTemplate.workflow.json',
				'sendTemplateWithSubaccount.workflow.json',
				'sendHtml.workflow.json',
			],
		});
	});

	describe('loadOptions', () => {
		describe('getTemplates', () => {
			it('should return a list of Mandrill templates', async () => {
				const mandrill = new Mandrill();
				const loadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
				loadOptionsFunctions.getNode.mockReturnValue(mock<INode>());
				loadOptionsFunctions.getCredentials.mockResolvedValue({ apiKey: 'test-api-key' });
				loadOptionsFunctions.helpers.request.mockResolvedValue([
					{
						slug: 'template-1',
						name: 'Test Template 1',
					},
					{
						slug: 'template-2',
						name: 'Test Template 2',
					},
				]);

				const result = await mandrill.methods.loadOptions.getTemplates.call(loadOptionsFunctions);

				expect(result).toEqual([
					{ name: 'Test Template 1', value: 'template-1' },
					{ name: 'Test Template 2', value: 'template-2' },
				]);
			});
		});
	});
});
