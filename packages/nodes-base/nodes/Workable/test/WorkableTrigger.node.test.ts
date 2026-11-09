import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { WorkableTrigger } from '../WorkableTrigger.node';

describe('WorkableTrigger', () => {
	const trigger = new WorkableTrigger();
	const accessToken = 'workable-account-token';
	const body = { event_type: 'candidate_created', data: { id: '1' } };
	const rawBody = Buffer.from(JSON.stringify(body));
	const validSignature = createHmac('sha256', accessToken).update(rawBody).digest('hex');

	const callWebhook = async (
		signature: string | undefined,
		requestBody: Buffer | null = rawBody,
	) => {
		const res = { status: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis(), end: vi.fn() };
		const logger = { warn: vi.fn() };
		const getBodyData = vi.fn(() => body);
		const getCredentials = vi.fn().mockResolvedValue({ accessToken });
		const result = await trigger.webhook.call({
			getCredentials,
			getRequestObject: () => ({
				header: (name: string) =>
					name.toLowerCase() === 'x-workable-signature' ? signature : undefined,
				rawBody: requestBody,
			}),
			getResponseObject: () => res,
			getBodyData,
			helpers: { returnJsonArray: (data: unknown) => [{ json: data }] },
			logger,
		} as unknown as IWebhookFunctions);
		return { result, res, logger, getBodyData, getCredentials };
	};

	it('should return workflow data when the signature is valid', async () => {
		const { result, res, logger, getCredentials } = await callWebhook(validSignature);

		expect(getCredentials).toHaveBeenCalledWith('workableApi');
		expect(res.status).not.toHaveBeenCalled();
		expect(logger.warn).not.toHaveBeenCalled();
		expect(result).toEqual({ workflowData: [[{ json: body }]] });
	});

	it('should return 401 when the signature does not match', async () => {
		const { result, res, logger, getBodyData } = await callWebhook('a'.repeat(64));

		expect(res.status).toHaveBeenCalledWith(401);
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('reactivate the workflow'));
		expect(getBodyData).not.toHaveBeenCalled();
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('should return 401 when the signature header is missing', async () => {
		const { result, res, getBodyData } = await callWebhook(undefined);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(getBodyData).not.toHaveBeenCalled();
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('should return 401 when the raw body is missing', async () => {
		const { result, res, getBodyData } = await callWebhook(validSignature, null);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(getBodyData).not.toHaveBeenCalled();
		expect(result).toEqual({ noWebhookResponse: true });
	});
});
