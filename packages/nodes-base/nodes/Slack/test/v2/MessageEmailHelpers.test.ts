import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as GenericFunctions from '../../V2/GenericFunctions';
import { resolveTargetForEmailIfNeeded } from '../../V2/MessageEmailHelpers';

describe('Slack V2 > MessageEmailHelpers', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let slackApiRequestSpy: jest.SpyInstance;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.getNode.mockReturnValue({ name: 'Slack', typeVersion: 2 } as any);
		slackApiRequestSpy = jest.spyOn(GenericFunctions, 'slackApiRequest');
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should return current target when idType is channel', async () => {
		const result = await resolveTargetForEmailIfNeeded(
			mockExecuteFunctions,
			0,
			'channel',
			'C123456789',
		);

		expect(result).toBe('C123456789');
		expect(slackApiRequestSpy).not.toHaveBeenCalled();
	});

	it('should return current target when user mode is not email', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'user') {
				return {
					mode: 'id',
					value: 'U123456789',
				};
			}
			return undefined;
		});

		const result = await resolveTargetForEmailIfNeeded(
			mockExecuteFunctions,
			0,
			'user',
			'U123456789',
		);

		expect(result).toBe('U123456789');
		expect(slackApiRequestSpy).not.toHaveBeenCalled();
	});

	it('should resolve user id by email when mode is email', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'user') {
				return {
					mode: 'email',
					value: 'user@example.com',
				};
			}
			return undefined;
		});

		slackApiRequestSpy.mockResolvedValue({
			ok: true,
			user: { id: 'UEMAIL123' },
		});

		const result = await resolveTargetForEmailIfNeeded(
			mockExecuteFunctions,
			0,
			'user',
			'initial-target',
		);

		expect(slackApiRequestSpy).toHaveBeenCalledWith(
			'GET',
			'/users.lookupByEmail',
			{},
			{ email: 'user@example.com' },
		);
		expect(result).toBe('UEMAIL123');
	});

	it('should throw when email is missing in email mode', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'user') {
				return {
					mode: 'email',
					value: '',
				};
			}
			return undefined;
		});

		await expect(
			resolveTargetForEmailIfNeeded(mockExecuteFunctions, 0, 'user', 'initial-target'),
		).rejects.toThrow(NodeOperationError);
		await expect(
			resolveTargetForEmailIfNeeded(mockExecuteFunctions, 0, 'user', 'initial-target'),
		).rejects.toThrow('Email is required when using "By Email" mode for User.');
		expect(slackApiRequestSpy).not.toHaveBeenCalled();
	});

	it('should throw when no user is found for email', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'user') {
				return {
					mode: 'email',
					value: 'missing@example.com',
				};
			}
			return undefined;
		});

		slackApiRequestSpy.mockResolvedValue({ ok: true });

		await expect(
			resolveTargetForEmailIfNeeded(mockExecuteFunctions, 0, 'user', 'initial-target'),
		).rejects.toThrow(NodeOperationError);
		await expect(
			resolveTargetForEmailIfNeeded(mockExecuteFunctions, 0, 'user', 'initial-target'),
		).rejects.toThrow('No Slack user found for email "missing@example.com".');
	});
});
