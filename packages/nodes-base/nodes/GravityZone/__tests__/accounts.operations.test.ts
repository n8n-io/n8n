import type { IDataObject, IExecuteFunctions, NodeParameterValueType } from 'n8n-workflow';

jest.mock('../transport', () => ({
	gravityZoneApiRequest: jest.fn(),
}));

import * as accounts from '../actions/accounts';
import { execute as executeConfigureNotificationsSettings } from '../actions/accounts/configureNotificationsSettings.operation';
import { execute as executeCreateAccount } from '../actions/accounts/createAccount.operation';
import { execute as executeDeleteAccount } from '../actions/accounts/deleteAccount.operation';
import { execute as executeGetAccountDetails } from '../actions/accounts/getAccountDetails.operation';
import { execute as executeGetAccountsList } from '../actions/accounts/getAccountsList.operation';
import { execute as executeGetNotificationsSettings } from '../actions/accounts/getNotificationsSettings.operation';
import { execute as executeUpdateAccount } from '../actions/accounts/updateAccount.operation';
import { gravityZoneApiRequest } from '../transport';
import {
	createMockExecuteFunctions,
	getOperationEntries,
	runOperationTest,
	type GravityZoneApiRequest,
} from './operationTestUtils';

const gravityZoneApiRequestMock =
	gravityZoneApiRequest as jest.MockedFunction<GravityZoneApiRequest>;

describe('GravityZone accounts operations', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	const stubParameters = (params: Record<string, NodeParameterValueType | object>) => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(paramName: string, _itemIndex: number, defaultValue?: unknown) => {
				if (Object.prototype.hasOwnProperty.call(params, paramName)) {
					return params[paramName];
				}

				return defaultValue as NodeParameterValueType | object | undefined;
			},
		);
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = createMockExecuteFunctions();
	});

	describe('getAccountDetails', () => {
		it('should include accountId when provided', async () => {
			stubParameters({ accountId: 'acc-123' });

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetAccountDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'getAccountDetails', {
				accountId: 'acc-123',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit accountId when empty', async () => {
			stubParameters({ accountId: '' });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetAccountDetails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'getAccountDetails', {});
		});
	});

	describe('getAccountsList', () => {
		it('should pass pagination options when provided', async () => {
			stubParameters({
				options: {
					page: 2,
					perPage: 25,
				},
			});

			const apiResult: IDataObject = { accounts: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetAccountsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'getAccountsList', {
				page: 2,
				perPage: 25,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should include perPage without page when provided', async () => {
			stubParameters({
				options: {
					perPage: 75,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetAccountsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'getAccountsList', {
				perPage: 75,
			});
		});

		it('should include page without perPage when provided', async () => {
			stubParameters({
				options: {
					page: 3,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetAccountsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'getAccountsList', {
				page: 3,
			});
		});

		it('should call API with empty params when no options', async () => {
			stubParameters({ options: {} });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetAccountsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'getAccountsList', {});
		});
	});

	describe('createAccount', () => {
		it('should build request with profile, optional fields, and parsed values', async () => {
			stubParameters({
				email: 'user@example.com',
				fullName: 'Ada Lovelace',
				additionalFields: {
					timezone: 'Europe/Bucharest',
					language: 'en_US',
					password: 'secret',
					role: 5,
					phoneNumberJson: '{"phone":"+1-555-0100"}',
					rightsJson: '{"access":"custom"}',
					targetIds: 'id-1, id-2 , , id-3',
					page: 2,
					perPage: 10,
				},
			});

			const apiResult: IDataObject = { accountId: 'acc-99' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateAccount.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'createAccount', {
				email: 'user@example.com',
				profile: {
					fullName: 'Ada Lovelace',
					timezone: 'Europe/Bucharest',
					language: 'en_US',
				},
				password: 'secret',
				role: 5,
				phoneNumber: { phone: '+1-555-0100' },
				rights: { access: 'custom' },
				targetIds: ['id-1', 'id-2', 'id-3'],
				page: 2,
				perPage: 10,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should send only required fields when no additional data', async () => {
			stubParameters({
				email: 'user@example.com',
				fullName: 'Ada Lovelace',
				additionalFields: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateAccount.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'createAccount', {
				email: 'user@example.com',
				profile: {
					fullName: 'Ada Lovelace',
				},
			});
		});

		it('should omit empty phone and rights payloads', async () => {
			stubParameters({
				email: 'user@example.com',
				fullName: 'Ada Lovelace',
				additionalFields: {
					phoneNumberJson: '{}',
					rightsJson: '{}',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateAccount.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'createAccount', {
				email: 'user@example.com',
				profile: {
					fullName: 'Ada Lovelace',
				},
			});
		});

		it('should accept object input for phone and rights', async () => {
			stubParameters({
				email: 'user@example.com',
				fullName: 'Ada Lovelace',
				additionalFields: {
					phoneNumberJson: { phone: '+1-555-0100' },
					rightsJson: { access: 'read' },
				},
			});

			const apiResult: IDataObject = { accountId: 'acc-42' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateAccount.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'createAccount', {
				email: 'user@example.com',
				profile: {
					fullName: 'Ada Lovelace',
				},
				phoneNumber: { phone: '+1-555-0100' },
				rights: { access: 'read' },
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit targetIds when empty string', async () => {
			stubParameters({
				email: 'user@example.com',
				fullName: 'Ada Lovelace',
				additionalFields: {
					targetIds: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateAccount.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'createAccount', {
				email: 'user@example.com',
				profile: {
					fullName: 'Ada Lovelace',
				},
			});
		});

		it('should throw when phoneNumberJson is invalid JSON', async () => {
			stubParameters({
				email: 'user@example.com',
				fullName: 'Ada Lovelace',
				additionalFields: {
					phoneNumberJson: '{not-json',
				},
			});

			await expect(executeCreateAccount.call(mockExecuteFunctions, 0)).rejects.toThrow();

			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when rightsJson is invalid JSON', async () => {
			stubParameters({
				email: 'user@example.com',
				fullName: 'Ada Lovelace',
				additionalFields: {
					rightsJson: '{not-json',
				},
			});

			await expect(executeCreateAccount.call(mockExecuteFunctions, 0)).rejects.toThrow();

			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('updateAccount', () => {
		it('should build request with profile, optional fields, and parsed values', async () => {
			stubParameters({
				accountId: 'acc-42',
				updateFields: {
					email: 'new@example.com',
					authenticationMethod: 1,
					password: 'pass-123',
					role: 2,
					fullName: 'Updated Name',
					timezone: 'UTC',
					language: 'en_US',
					phoneNumberJson: '{"country":"RO"}',
					rightsJson: '{"canEdit":true}',
					targetIds: 't-1, t-2 , , t-3',
				},
			});

			const apiResult: IDataObject = { success: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeUpdateAccount.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'updateAccount', {
				accountId: 'acc-42',
				email: 'new@example.com',
				authenticationMethod: 1,
				password: 'pass-123',
				role: 2,
				profile: {
					fullName: 'Updated Name',
					timezone: 'UTC',
					language: 'en_US',
				},
				phoneNumber: { country: 'RO' },
				rights: { canEdit: true },
				targetIds: ['t-1', 't-2', 't-3'],
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should include partial profile fields and omit empty values', async () => {
			stubParameters({
				accountId: 'acc-42',
				updateFields: {
					email: '',
					timezone: 'UTC',
					language: '',
					targetIds: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateAccount.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'updateAccount', {
				accountId: 'acc-42',
				profile: {
					timezone: 'UTC',
				},
			});
		});

		it('should call API with only accountId when no update fields are provided', async () => {
			stubParameters({
				accountId: 'acc-42',
				updateFields: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateAccount.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'updateAccount', {
				accountId: 'acc-42',
			});
		});

		it('should accept object input for phone and rights', async () => {
			stubParameters({
				accountId: 'acc-42',
				updateFields: {
					phoneNumberJson: { country: 'RO' },
					rightsJson: { canEdit: true },
				},
			});

			const apiResult: IDataObject = { updated: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeUpdateAccount.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'updateAccount', {
				accountId: 'acc-42',
				phoneNumber: { country: 'RO' },
				rights: { canEdit: true },
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit profile when no profile fields supplied', async () => {
			stubParameters({
				accountId: 'acc-42',
				updateFields: {
					password: 'pass-123',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateAccount.call(mockExecuteFunctions, 0);

			const params = gravityZoneApiRequestMock.mock.calls[0][2];

			expect(params.profile).toBeUndefined();
			expect(params.password).toBe('pass-123');
		});

		it('should include authenticationMethod when set to 0', async () => {
			stubParameters({
				accountId: 'acc-42',
				updateFields: {
					authenticationMethod: 0,
				},
			});

			const apiResult: IDataObject = { updated: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeUpdateAccount.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'updateAccount', {
				accountId: 'acc-42',
				authenticationMethod: 0,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit empty phone and rights payloads', async () => {
			stubParameters({
				accountId: 'acc-42',
				updateFields: {
					phoneNumberJson: '{}',
					rightsJson: '{}',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateAccount.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'updateAccount', {
				accountId: 'acc-42',
			});
		});

		it('should throw when phoneNumberJson is invalid JSON', async () => {
			stubParameters({
				accountId: 'acc-42',
				updateFields: {
					phoneNumberJson: '{not-json',
				},
			});

			await expect(executeUpdateAccount.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when rightsJson is invalid JSON', async () => {
			stubParameters({
				accountId: 'acc-42',
				updateFields: {
					rightsJson: '{not-json',
				},
			});

			await expect(executeUpdateAccount.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('deleteAccount', () => {
		it('should call deleteAccount with account ID', async () => {
			stubParameters({ accountId: 'acc-99' });

			const apiResult: IDataObject = { deleted: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeDeleteAccount.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('accounts', 'deleteAccount', {
				accountId: 'acc-99',
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('getNotificationsSettings', () => {
		it('should include accountId when provided', async () => {
			stubParameters({ accountId: 'acc-321' });

			const apiResult: IDataObject = { settings: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetNotificationsSettings.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'accounts',
				'getNotificationsSettings',
				{
					accountId: 'acc-321',
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit accountId when empty', async () => {
			stubParameters({ accountId: '' });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetNotificationsSettings.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'accounts',
				'getNotificationsSettings',
				{},
			);
		});
	});

	describe('configureNotificationsSettings', () => {
		it('should build request with parsed notifications settings and options', async () => {
			stubParameters({
				options: {
					accountId: 'acc-55',
					deleteAfter: 60,
					emailAddresses: 'one@example.com, two@example.com ,',
					includeDeviceFQDN: true,
					includeDeviceName: false,
					sendOnlyPlainTextEmail: false,
					notificationsSettingsJson: '[{"type":"malware","enabled":true}]',
				},
			});

			const apiResult: IDataObject = { saved: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeConfigureNotificationsSettings.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'accounts',
				'configureNotificationsSettings',
				{
					accountId: 'acc-55',
					deleteAfter: 60,
					emailAddresses: ['one@example.com', 'two@example.com'],
					includeDeviceFQDN: true,
					includeDeviceName: false,
					sendOnlyPlainTextEmail: false,
					notificationsSettings: [{ type: 'malware', enabled: true }],
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should accept notifications settings array input', async () => {
			stubParameters({
				options: {
					includeDeviceFQDN: false,
					notificationsSettingsJson: [{ type: 'phishing', enabled: false }],
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeConfigureNotificationsSettings.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'accounts',
				'configureNotificationsSettings',
				{
					includeDeviceFQDN: false,
					notificationsSettings: [{ type: 'phishing', enabled: false }],
				},
			);
		});

		it('should omit empty email list and notifications settings', async () => {
			stubParameters({
				options: {
					emailAddresses: '',
					notificationsSettingsJson: '[]',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeConfigureNotificationsSettings.call(mockExecuteFunctions, 0);

			const params = gravityZoneApiRequestMock.mock.calls[0][2];

			expect(params.emailAddresses).toBeUndefined();
			expect(params.includeDeviceFQDN).toBeUndefined();
			expect(params.includeDeviceName).toBeUndefined();
			expect(params.sendOnlyPlainTextEmail).toBeUndefined();
			expect(params.deleteAfter).toBeUndefined();
			expect(params.notificationsSettings).toBeUndefined();
		});

		it('should call API with empty params when no options are provided', async () => {
			stubParameters({ options: {} });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeConfigureNotificationsSettings.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'accounts',
				'configureNotificationsSettings',
				{},
			);
		});

		it('should omit accountId when empty', async () => {
			stubParameters({
				options: {
					accountId: '',
					emailAddresses: 'one@example.com',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeConfigureNotificationsSettings.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'accounts',
				'configureNotificationsSettings',
				{
					emailAddresses: ['one@example.com'],
				},
			);
		});

		it('should throw when notificationsSettingsJson is invalid JSON', async () => {
			stubParameters({
				options: {
					notificationsSettingsJson: '{not-json',
				},
			});

			await expect(
				executeConfigureNotificationsSettings.call(mockExecuteFunctions, 0),
			).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('operation exports', () => {
		const operations = getOperationEntries(accounts as Record<string, unknown>);

		for (const { name, module } of operations) {
			it(`executes ${name}`, async () => {
				await runOperationTest(name, module, mockExecuteFunctions, gravityZoneApiRequestMock);
			});
		}
	});
});
