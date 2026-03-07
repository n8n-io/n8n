import { TwilioTrigger } from '../TwilioTrigger.node';
import * as TwilioTriggerHelpers from '../TwilioTriggerHelpers';

describe('TwilioTrigger Node', () => {
	describe('webhook method', () => {
		let mockThis: {
			getBodyData: jest.Mock;
			getResponseObject: jest.Mock;
			helpers: { returnJsonArray: jest.Mock };
		};

		beforeEach(() => {
			jest.clearAllMocks();

			mockThis = {
				getBodyData: jest.fn().mockReturnValue({
					specversion: '1.0',
					type: 'com.twilio.messaging.inbound-message.received',
					data: { messageSid: 'SM123' },
				}),
				getResponseObject: jest.fn().mockReturnValue({
					status: jest.fn().mockReturnThis(),
					send: jest.fn().mockReturnThis(),
					end: jest.fn(),
				}),
				helpers: {
					returnJsonArray: jest.fn().mockImplementation((data) => [{ json: data }]),
				},
			};
		});

		it('should reject with 401 when signature verification fails', async () => {
			jest.spyOn(TwilioTriggerHelpers, 'verifySignature').mockResolvedValueOnce(false);

			const trigger = new TwilioTrigger();
			const result = await trigger.webhook.call(mockThis as never);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockThis.getResponseObject).toHaveBeenCalled();
			const res = mockThis.getResponseObject();
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith('Unauthorized');
			expect(res.end).toHaveBeenCalled();
		});

		it('should process webhook when signature verification succeeds', async () => {
			jest.spyOn(TwilioTriggerHelpers, 'verifySignature').mockResolvedValueOnce(true);

			const trigger = new TwilioTrigger();
			const result = await trigger.webhook.call(mockThis as never);

			expect(result).toHaveProperty('workflowData');
			expect(mockThis.getBodyData).toHaveBeenCalled();
			expect(mockThis.helpers.returnJsonArray).toHaveBeenCalled();
		});

		it('should return the body data as workflow data when verification passes', async () => {
			const testBodyData = {
				specversion: '1.0',
				type: 'com.twilio.messaging.inbound-message.received',
				data: { messageSid: 'SM456', from: '+1234567890' },
			};
			mockThis.getBodyData.mockReturnValue(testBodyData);
			jest.spyOn(TwilioTriggerHelpers, 'verifySignature').mockResolvedValueOnce(true);

			const trigger = new TwilioTrigger();
			const result = await trigger.webhook.call(mockThis as never);

			expect(result.workflowData).toBeDefined();
			expect(mockThis.helpers.returnJsonArray).toHaveBeenCalledWith(testBodyData);
		});
	});
});
