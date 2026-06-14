import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import {
	googleApiRequest,
	googleApiRequestAllItems,
	mapUserExtraFields,
} from '../GenericFunctions';

describe('Google GSuiteAdmin Node', () => {
	let mockContext: IExecuteFunctions | ILoadOptionsFunctions;

	beforeEach(() => {
		mockContext = {
			helpers: {
				httpRequestWithAuthentication: jest.fn(),
			},
			getNode: jest.fn(),
		} as unknown as IExecuteFunctions | ILoadOptionsFunctions;

		jest.clearAllMocks();
	});

	it('should make a successful API request with default options', async () => {
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValueOnce({
			success: true,
		});

		const result = await googleApiRequest.call(mockContext, 'GET', '/example/resource');

		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'gSuiteAdminOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				url: 'https://www.googleapis.com/admin/example/resource',
				headers: { 'Content-Type': 'application/json' },
				json: true,
				qs: {},
			}),
		);
		expect(result).toEqual({ success: true });
	});

	it('should omit the body if it is empty', async () => {
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValueOnce({
			success: true,
		});

		await googleApiRequest.call(mockContext, 'GET', '/example/resource', {});

		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'gSuiteAdminOAuth2Api',
			expect.not.objectContaining({ body: expect.anything() }),
		);
	});

	it('should throw a NodeApiError if the request fails', async () => {
		const errorResponse = { message: 'API Error' };
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockRejectedValueOnce(
			errorResponse,
		);

		await expect(googleApiRequest.call(mockContext, 'GET', '/example/resource')).rejects.toThrow(
			NodeApiError,
		);

		expect(mockContext.getNode).toHaveBeenCalled();
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalled();
	});

	it('should return all items across multiple pages', async () => {
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock)
			.mockResolvedValueOnce({
				nextPageToken: 'pageToken1',
				items: [{ id: '1' }, { id: '2' }],
			})
			.mockResolvedValueOnce({
				nextPageToken: 'pageToken2',
				items: [{ id: '3' }, { id: '4' }],
			})
			.mockResolvedValueOnce({
				nextPageToken: '',
				items: [{ id: '5' }],
			});

		const result = await googleApiRequestAllItems.call(
			mockContext,
			'items',
			'GET',
			'/example/resource',
		);

		expect(result).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }]);
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(3);
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
			1,
			'gSuiteAdminOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				qs: { maxResults: 100, pageToken: '' },
				headers: { 'Content-Type': 'application/json' },
				url: 'https://www.googleapis.com/admin/example/resource',
				json: true,
			}),
		);
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			'gSuiteAdminOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				qs: { maxResults: 100, pageToken: '' },
				headers: { 'Content-Type': 'application/json' },
				url: 'https://www.googleapis.com/admin/example/resource',
				json: true,
			}),
		);
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
			3,
			'gSuiteAdminOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				qs: { maxResults: 100, pageToken: '' },
				headers: { 'Content-Type': 'application/json' },
				url: 'https://www.googleapis.com/admin/example/resource',
				json: true,
			}),
		);
	});

	it('should handle single-page responses', async () => {
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValueOnce({
			nextPageToken: '',
			items: [{ id: '1' }, { id: '2' }],
		});

		const result = await googleApiRequestAllItems.call(
			mockContext,
			'items',
			'GET',
			'/example/resource',
		);

		expect(result).toEqual([{ id: '1' }, { id: '2' }]);
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('should handle empty responses', async () => {
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValueOnce({
			nextPageToken: '',
			items: [],
		});

		const result = await googleApiRequestAllItems.call(
			mockContext,
			'items',
			'GET',
			'/example/resource',
		);

		expect(result).toEqual([]);
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('should throw a NodeApiError if a request fails', async () => {
		const errorResponse = { message: 'API Error' };
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockRejectedValueOnce(
			errorResponse,
		);

		await expect(
			googleApiRequestAllItems.call(mockContext, 'items', 'GET', '/example/resource'),
		).rejects.toThrow();

		expect(mockContext.getNode).toHaveBeenCalled();
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	describe('mapUserExtraFields', () => {
		it('should map scalar attributes onto the body', () => {
			const body: IDataObject = {};

			mapUserExtraFields(
				{
					orgUnitPath: '/Sales',
					recoveryEmail: 'recovery@example.com',
					recoveryPhone: '+12025550123',
					includeInGlobalAddressList: false,
					ipWhitelisted: true,
				},
				body,
			);

			expect(body).toEqual({
				orgUnitPath: '/Sales',
				recoveryEmail: 'recovery@example.com',
				recoveryPhone: '+12025550123',
				includeInGlobalAddressList: false,
				ipWhitelisted: true,
			});
		});

		it('should unwrap single-object fixedCollections (gender, notes)', () => {
			const body: IDataObject = {};

			mapUserExtraFields(
				{
					genderUi: { genderValues: { type: 'custom', customGender: 'non-binary' } },
					notesUi: { notesValues: { contentType: 'text_plain', value: 'A note' } },
				},
				body,
			);

			expect(body).toEqual({
				gender: { type: 'custom', customGender: 'non-binary' },
				notes: { contentType: 'text_plain', value: 'A note' },
			});
		});

		it('should unwrap array fixedCollections into API arrays', () => {
			const body: IDataObject = {};

			mapUserExtraFields(
				{
					organizationUi: {
						organizationValues: [{ name: 'Acme', title: 'Engineer', type: 'work' }],
					},
					relationsUi: { relationsValues: [{ type: 'manager', value: 'boss@example.com' }] },
					addressesUi: { addressesValues: [{ type: 'home', locality: 'Berlin' }] },
				},
				body,
			);

			expect(body).toEqual({
				organizations: [{ name: 'Acme', title: 'Engineer', type: 'work' }],
				relations: [{ type: 'manager', value: 'boss@example.com' }],
				addresses: [{ type: 'home', locality: 'Berlin' }],
			});
		});

		it('should not set keys for omitted fields', () => {
			const body: IDataObject = {};

			mapUserExtraFields({}, body);

			expect(body).toEqual({});
		});
	});
});
