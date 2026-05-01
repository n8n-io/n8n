import type { IHookFunctions } from 'n8n-workflow';

import { Sms77Trigger } from '../Sms77Trigger.node';
import * as GenericFunctions from '../v2/GenericFunctions';

const makeHookContext = (
	overrides: {
		events?: string[];
		additionalFields?: Record<string, unknown>;
		staticData?: Record<string, unknown>;
	} = {},
) => {
	const staticData = overrides.staticData ?? {};
	const ctx = {
		getNodeWebhookUrl: jest.fn().mockReturnValue('https://n8n.example/webhook/abc'),
		getNodeParameter: jest.fn((name: string) => {
			if (name === 'events') return overrides.events ?? ['sms_mo', 'dlr'];
			if (name === 'additionalFields') return overrides.additionalFields ?? {};
			return undefined;
		}),
		getWorkflowStaticData: jest.fn().mockReturnValue(staticData),
		getNode: jest
			.fn()
			.mockReturnValue({ name: 'sevenTrigger', type: 'n8n-nodes-base.sms77Trigger' }),
		helpers: {} as never,
	};
	return { ctx, staticData };
};

describe('Sms77Trigger lifecycle', () => {
	let trigger: Sms77Trigger;
	let apiRequestSpy: jest.SpyInstance;

	beforeEach(() => {
		trigger = new Sms77Trigger();
		apiRequestSpy = jest.spyOn(GenericFunctions, 'sevenApiRequest');
	});

	afterEach(() => {
		apiRequestSpy.mockRestore();
	});

	describe('checkExists', () => {
		it('returns false when no matching hook exists', async () => {
			apiRequestSpy.mockResolvedValueOnce({ hooks: [] });
			const { ctx, staticData } = makeHookContext();

			const result = await trigger.webhookMethods.default.checkExists.call(
				ctx as unknown as IHookFunctions,
			);

			expect(result).toBe(false);
			expect(staticData.hookIds).toBeUndefined();
		});

		it('returns true and stores hook IDs when matching hooks exist', async () => {
			apiRequestSpy.mockResolvedValueOnce({
				hooks: [
					{ id: 1, target_url: 'https://n8n.example/webhook/abc', event_type: 'sms_mo' },
					{ id: 2, target_url: 'https://n8n.example/webhook/abc', event_type: 'dlr' },
					{ id: 3, target_url: 'https://other.example', event_type: 'sms_mo' },
				],
			});
			const { ctx, staticData } = makeHookContext({ events: ['sms_mo', 'dlr'] });

			const result = await trigger.webhookMethods.default.checkExists.call(
				ctx as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(staticData.hookIds).toEqual([1, 2]);
		});
	});

	describe('create', () => {
		it('subscribes one hook per selected event with request_method=json', async () => {
			apiRequestSpy.mockResolvedValueOnce({ id: 11 }).mockResolvedValueOnce({ id: 12 });

			const { ctx, staticData } = makeHookContext({ events: ['sms_mo', 'dlr'] });

			const result = await trigger.webhookMethods.default.create.call(
				ctx as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(apiRequestSpy).toHaveBeenCalledTimes(2);
			expect(apiRequestSpy).toHaveBeenNthCalledWith(
				1,
				'POST',
				'/hooks',
				expect.objectContaining({
					target_url: 'https://n8n.example/webhook/abc',
					event_type: 'sms_mo',
					request_method: 'json',
				}),
			);
			expect(staticData.hookIds).toEqual([11, 12]);
		});

		it('uses event_type=all when all events are selected', async () => {
			apiRequestSpy.mockResolvedValueOnce({ id: 99 });

			const allEvents = [
				'sms_mo',
				'dlr',
				'tracking',
				'voice_call',
				'voice_status',
				'voice_dtmf',
				'rcs',
				'wa_mo',
			];
			const { ctx } = makeHookContext({ events: allEvents });

			await trigger.webhookMethods.default.create.call(ctx as unknown as IHookFunctions);

			expect(apiRequestSpy).toHaveBeenCalledTimes(1);
			expect(apiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/hooks',
				expect.objectContaining({ event_type: 'all' }),
			);
		});

		it('returns false when no events are selected', async () => {
			const { ctx } = makeHookContext({ events: [] });

			const result = await trigger.webhookMethods.default.create.call(
				ctx as unknown as IHookFunctions,
			);

			expect(result).toBe(false);
			expect(apiRequestSpy).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('deletes all stored hook IDs and clears static data', async () => {
			apiRequestSpy.mockResolvedValue({ success: true });
			const { ctx, staticData } = makeHookContext({
				staticData: { hookIds: [11, 12, 13] },
			});

			const result = await trigger.webhookMethods.default.delete.call(
				ctx as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(apiRequestSpy).toHaveBeenCalledTimes(3);
			expect(apiRequestSpy).toHaveBeenCalledWith('DELETE', '/hooks', { id: 11 });
			expect(apiRequestSpy).toHaveBeenCalledWith('DELETE', '/hooks', { id: 12 });
			expect(apiRequestSpy).toHaveBeenCalledWith('DELETE', '/hooks', { id: 13 });
			expect(staticData.hookIds).toBeUndefined();
		});

		it('continues deleting remaining hooks if one fails', async () => {
			apiRequestSpy
				.mockResolvedValueOnce({ success: true })
				.mockRejectedValueOnce(new Error('boom'))
				.mockResolvedValueOnce({ success: true });

			const { ctx, staticData } = makeHookContext({
				staticData: { hookIds: [11, 12, 13] },
			});

			const result = await trigger.webhookMethods.default.delete.call(
				ctx as unknown as IHookFunctions,
			);

			expect(result).toBe(true);
			expect(apiRequestSpy).toHaveBeenCalledTimes(3);
			expect(staticData.hookIds).toBeUndefined();
		});
	});
});
