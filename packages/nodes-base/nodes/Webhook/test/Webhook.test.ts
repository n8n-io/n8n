import type { Request } from 'express';
import type { IWebhookFunctions } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';
import { Webhook } from '../Webhook.node';
import { testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

describe('Test Webhook Node', () => {
	testWorkflows(workflows);

	describe('handleFormData', () => {
		const node = new Webhook();
		const context = mock<IWebhookFunctions>({
			nodeHelpers: mock(),
		});
		context.getNodeParameter.calledWith('options').mockReturnValue({});
		const req = mock<Request>();
		req.contentType = 'multipart/form-data';
		context.getRequestObject.mockReturnValue(req);

		it('should handle when no files are present', async () => {
			req.body = {
				files: {},
			};
			const returnData = await node.webhook(context);
			expect(returnData.workflowData?.[0][0].binary).toBeUndefined();
			expect(context.nodeHelpers.copyBinaryFile).not.toHaveBeenCalled();
		});

		it('should handle when files are present', async () => {
			req.body = {
				files: { file1: {} },
			};
			const returnData = await node.webhook(context);
			expect(returnData.workflowData?.[0][0].binary).not.toBeUndefined();
			expect(context.nodeHelpers.copyBinaryFile).toHaveBeenCalled();
		});
	});
});
