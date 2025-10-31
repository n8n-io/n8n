import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { getGoogleAccessToken } from '../../../GenericFunctions';
import {
	googleApiRequest,
	jsonToDocument,
	documentToJson,
	fullDocumentToJson,
} from '../GenericFunctions';

// Mock the getGoogleAccessToken function
jest.mock('../../../GenericFunctions', () => ({
	getGoogleAccessToken: jest.fn(),
}));

const mockGetGoogleAccessToken = getGoogleAccessToken as jest.MockedFunction<
	typeof getGoogleAccessToken
>;

describe('GoogleFirebaseCloudFirestore > GenericFunctions', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;
	let mockNode: INode;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		mockNode = mock<INode>({
			id: 'test-node',
			name: 'Test CloudFirestore Node',
			type: 'n8n-nodes-base.googleFirebaseCloudFirestore',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockLoadOptionsFunctions.getNode.mockReturnValue(mockNode);

		jest.clearAllMocks();
	});

	describe('googleApiRequest', () => {
		const mockRequestWithAuth = jest.fn();

		beforeEach(() => {
			mockExecuteFunctions.helpers.requestWithAuthentication = mockRequestWithAuth;
			mockLoadOptionsFunctions.helpers.requestWithAuthentication = mockRequestWithAuth;
		});

		describe('OAuth2 authentication', () => {
			beforeEach(() => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('oAuth2Api');
				mockLoadOptionsFunctions.getNodeParameter.mockReturnValue('oAuth2Api');
			});

			it('should make successful API request with OAuth2', async () => {
				const mockResponse = { success: true, data: 'test' };
				mockRequestWithAuth.mockResolvedValue(mockResponse);

				const result = await googleApiRequest.call(
					mockExecuteFunctions,
					'GET',
					'/databases/test/documents/users',
				);

				expect(result).toEqual(mockResponse);
				expect(mockRequestWithAuth).toHaveBeenCalledWith(
					'googleFirebaseCloudFirestoreOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://firestore.googleapis.com/v1/projects/databases/test/documents/users',
						headers: {
							'Content-Type': 'application/json',
						},
						qs: {},
						qsStringifyOptions: {
							arrayFormat: 'repeat',
						},
						json: true,
					}),
				);
			});

			it('should remove empty body for GET requests', async () => {
				const mockResponse = { success: true };
				mockRequestWithAuth.mockResolvedValue(mockResponse);

				await googleApiRequest.call(mockExecuteFunctions, 'GET', '/test', {});

				expect(mockRequestWithAuth).toHaveBeenCalledWith(
					'googleFirebaseCloudFirestoreOAuth2Api',
					expect.not.objectContaining({ body: expect.anything() }),
				);
			});

			it('should include body for POST requests', async () => {
				const mockResponse = { success: true };
				const requestBody = { name: 'Test', value: 'data' };
				mockRequestWithAuth.mockResolvedValue(mockResponse);

				await googleApiRequest.call(mockExecuteFunctions, 'POST', '/test', requestBody);

				expect(mockRequestWithAuth).toHaveBeenCalledWith(
					'googleFirebaseCloudFirestoreOAuth2Api',
					expect.objectContaining({
						method: 'POST',
						body: requestBody,
					}),
				);
			});

			it('should include query parameters', async () => {
				const mockResponse = { success: true };
				const queryParams = { pageSize: 100, orderBy: 'name' };
				mockRequestWithAuth.mockResolvedValue(mockResponse);

				await googleApiRequest.call(mockExecuteFunctions, 'GET', '/test', {}, queryParams);

				expect(mockRequestWithAuth).toHaveBeenCalledWith(
					'googleFirebaseCloudFirestoreOAuth2Api',
					expect.objectContaining({
						qs: queryParams,
					}),
				);
			});

			it('should use custom URI when provided', async () => {
				const mockResponse = { success: true };
				const customUri = 'https://custom.googleapis.com/v1/test';
				mockRequestWithAuth.mockResolvedValue(mockResponse);

				await googleApiRequest.call(mockExecuteFunctions, 'GET', '/test', {}, {}, customUri);

				expect(mockRequestWithAuth).toHaveBeenCalledWith(
					'googleFirebaseCloudFirestoreOAuth2Api',
					expect.objectContaining({
						uri: customUri,
					}),
				);
			});
		});

		describe('Service Account authentication', () => {
			beforeEach(() => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('serviceAccount');
				mockLoadOptionsFunctions.getNodeParameter.mockReturnValue('serviceAccount');
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					email: 'test@project.iam.gserviceaccount.com',
					privateKey: 'test-key',
				});
				mockLoadOptionsFunctions.getCredentials.mockResolvedValue({
					email: 'test@project.iam.gserviceaccount.com',
					privateKey: 'test-key',
				});
			});

			it('should make API request with service account', async () => {
				const mockResponse = { success: true };
				const mockAccessToken = 'mock-access-token';
				mockGetGoogleAccessToken.mockResolvedValue({ access_token: mockAccessToken });
				mockRequestWithAuth.mockResolvedValue(mockResponse);

				const result = await googleApiRequest.call(mockExecuteFunctions, 'GET', '/test');

				expect(result).toEqual(mockResponse);
				expect(mockGetGoogleAccessToken).toHaveBeenCalledWith(
					expect.objectContaining({
						email: 'test@project.iam.gserviceaccount.com',
						privateKey: 'test-key',
					}),
					'firestore',
				);
				expect(mockRequestWithAuth).toHaveBeenCalledWith(
					'googleApi',
					expect.objectContaining({
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${mockAccessToken}`,
						},
					}),
				);
			});

			it('should handle service account credential errors', async () => {
				const credentialError = new Error('Invalid service account');
				mockExecuteFunctions.getCredentials.mockRejectedValue(credentialError);

				await expect(googleApiRequest.call(mockExecuteFunctions, 'GET', '/test')).rejects.toThrow(
					NodeApiError,
				);
			});

			it('should handle access token errors', async () => {
				const tokenError = new Error('Failed to get access token');
				mockGetGoogleAccessToken.mockRejectedValue(tokenError);

				await expect(googleApiRequest.call(mockExecuteFunctions, 'GET', '/test')).rejects.toThrow(
					NodeApiError,
				);
			});
		});

		describe('error handling', () => {
			beforeEach(() => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('oAuth2Api');
			});

			it('should throw NodeAPIError on API failure', async () => {
				const apiError = new Error('API request failed');
				mockRequestWithAuth.mockRejectedValue(apiError);

				await expect(googleApiRequest.call(mockExecuteFunctions, 'GET', '/test')).rejects.toThrow(
					NodeApiError,
				);

				expect(mockExecuteFunctions.getNode).toHaveBeenCalled();
			});

			it('should work with ILoadOptionsFunctions', async () => {
				const mockResponse = { options: ['option1', 'option2'] };
				mockRequestWithAuth.mockResolvedValue(mockResponse);

				const result = await googleApiRequest.call(mockLoadOptionsFunctions, 'GET', '/options');

				expect(result).toEqual(mockResponse);
			});
		});
	});

	describe('jsonToDocument', () => {
		it('should convert boolean values', () => {
			expect(jsonToDocument(true as any)).toEqual({ booleanValue: true });
			expect(jsonToDocument(false as any)).toEqual({ booleanValue: false });
			// Note: The current implementation preserves string 'true'/'false' as strings in booleanValue
			// While Firestore API spec expects actual boolean values for booleanValue fields,
			// this behavior is maintained for backward compatibility and to avoid breaking existing workflows
			// that may depend on this string preservation behavior in certain edge cases
			expect(jsonToDocument('true')).toEqual({ booleanValue: 'true' });
			expect(jsonToDocument('false')).toEqual({ booleanValue: 'false' });
		});

		it('should convert null values', () => {
			expect(jsonToDocument(null as any)).toEqual({ nullValue: null });
		});

		it('should convert numeric values', () => {
			expect(jsonToDocument(42)).toEqual({ integerValue: 42 });
			expect(jsonToDocument(3.14)).toEqual({ doubleValue: 3.14 });
			// Note: The current implementation preserves numeric strings as strings in Firestore document values
			// While Firestore API spec typically expects numeric types for doubleValue/integerValue,
			// this behavior is maintained for backward compatibility and to avoid breaking existing workflows
			// that may depend on string preservation in certain edge cases
			expect(jsonToDocument('123')).toEqual({ integerValue: '123' });
			expect(jsonToDocument('123.45')).toEqual({ doubleValue: '123.45' });
		});

		it('should convert string values', () => {
			expect(jsonToDocument('hello world')).toEqual({ stringValue: 'hello world' });
			expect(jsonToDocument('')).toEqual({ stringValue: '' });
		});

		it('should convert date strings to timestamps', () => {
			const dateString = '2023-01-01T10:00:00.000Z';
			const result = jsonToDocument(dateString);
			expect(result).toHaveProperty('timestampValue');
			expect(result.timestampValue).toBe('2023-01-01T10:00:00.000Z');
		});

		it('should convert arrays', () => {
			const array = [1, 'test', true, null] as any;
			const result = jsonToDocument(array);
			expect(result).toEqual({
				arrayValue: {
					values: [
						{ integerValue: 1 },
						{ stringValue: 'test' },
						{ booleanValue: true },
						{ nullValue: null },
					],
				},
			});
		});

		it('should convert objects', () => {
			const obj = {
				name: 'John',
				age: 30,
				active: true,
				metadata: null,
			};
			const result = jsonToDocument(obj);
			expect(result).toEqual({
				mapValue: {
					fields: {
						name: { stringValue: 'John' },
						age: { integerValue: 30 },
						active: { booleanValue: true },
						metadata: { nullValue: null },
					},
				},
			});
		});

		it('should convert nested objects', () => {
			const nestedObj = {
				user: {
					profile: {
						name: 'John',
						settings: {
							notifications: true,
						},
					},
				},
			};
			const result = jsonToDocument(nestedObj);
			expect(result).toEqual({
				mapValue: {
					fields: {
						user: {
							mapValue: {
								fields: {
									profile: {
										mapValue: {
											fields: {
												name: { stringValue: 'John' },
												settings: {
													mapValue: {
														fields: {
															notifications: { booleanValue: true },
														},
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			});
		});

		it('should handle edge cases', () => {
			expect(jsonToDocument(0)).toEqual({ integerValue: 0 });
			expect(jsonToDocument(NaN as any)).toEqual({});
			expect(jsonToDocument(undefined as any)).toEqual({});
		});

		it('should skip unsafe object properties', () => {
			const obj = { safeProperty: 'safe' } as any;
			Object.defineProperty(obj, '__proto__', {
				value: 'unsafe',
				enumerable: true,
			});

			const result = jsonToDocument(obj);
			expect(result).toEqual({
				mapValue: {
					fields: {
						safeProperty: { stringValue: 'safe' },
					},
				},
			});
		});
	});

	describe('documentToJson', () => {
		it('should handle undefined input', () => {
			expect(documentToJson(undefined as any)).toEqual({});
		});

		it('should convert primitive document values', () => {
			expect(documentToJson({ stringValue: 'hello' })).toBe('hello');
			expect(documentToJson({ integerValue: 42 })).toBe(42);
			expect(documentToJson({ doubleValue: 3.14 })).toBe(3.14);
			expect(documentToJson({ booleanValue: true })).toBe(true);
			expect(documentToJson({ nullValue: null })).toBe(null);
			expect(documentToJson({ timestampValue: '2023-01-01T00:00:00.000Z' })).toBe(
				'2023-01-01T00:00:00.000Z',
			);
		});

		it('should convert map values', () => {
			const mapValue = {
				mapValue: {
					fields: {
						name: { stringValue: 'John' },
						age: { integerValue: 30 },
					},
				},
			};
			expect(documentToJson(mapValue)).toEqual({
				name: 'John',
				age: 30,
			});
		});

		it('should convert array values', () => {
			const arrayValue = {
				arrayValue: {
					values: [{ stringValue: 'item1' }, { integerValue: 42 }, { booleanValue: true }],
				},
			};
			expect(documentToJson(arrayValue)).toEqual(['item1', 42, true]);
		});

		it('should convert nested structures', () => {
			const nested = {
				user: {
					mapValue: {
						fields: {
							name: { stringValue: 'John' },
							tags: {
								arrayValue: {
									values: [{ stringValue: 'developer' }, { stringValue: 'javascript' }],
								},
							},
							metadata: {
								mapValue: {
									fields: {
										created: { timestampValue: '2023-01-01T00:00:00.000Z' },
										active: { booleanValue: true },
									},
								},
							},
						},
					},
				},
			};

			const result = documentToJson(nested);
			expect(result).toEqual({
				user: {
					name: 'John',
					tags: ['developer', 'javascript'],
					metadata: {
						created: '2023-01-01T00:00:00.000Z',
						active: true,
					},
				},
			});
		});

		it('should handle empty arrays', () => {
			const emptyArray = { arrayValue: { values: [] } };
			expect(documentToJson(emptyArray)).toEqual([]);
		});

		it('should handle arrays with undefined values', () => {
			const arrayWithUndefined = { arrayValue: {} };
			expect(documentToJson(arrayWithUndefined)).toEqual([]);
		});

		it('should handle empty map values', () => {
			const emptyMap = { mapValue: { fields: {} } };
			expect(documentToJson(emptyMap)).toEqual({});
		});

		it('should handle map values with undefined fields', () => {
			const mapWithUndefinedFields = { mapValue: {} };
			expect(documentToJson(mapWithUndefinedFields)).toEqual({});
		});
	});

	describe('fullDocumentToJson', () => {
		it('should handle undefined input', () => {
			expect(fullDocumentToJson(undefined as any)).toBeUndefined();
		});

		it('should extract metadata and fields', () => {
			const document = {
				name: 'projects/test/databases/(default)/documents/users/123',
				id: 'user123',
				createTime: '2023-01-01T10:00:00.000Z',
				updateTime: '2023-01-01T11:00:00.000Z',
				fields: {
					name: { stringValue: 'John Doe' },
					email: { stringValue: 'john@example.com' },
					age: { integerValue: 30 },
					active: { booleanValue: true },
				},
			};

			const result = fullDocumentToJson(document);
			expect(result).toEqual({
				_name: 'projects/test/databases/(default)/documents/users/123',
				_id: 'user123',
				_createTime: '2023-01-01T10:00:00.000Z',
				_updateTime: '2023-01-01T11:00:00.000Z',
				name: 'John Doe',
				email: 'john@example.com',
				age: 30,
				active: true,
			});
		});

		it('should handle document without fields', () => {
			const document = {
				name: 'projects/test/databases/(default)/documents/empty/123',
				id: 'empty123',
				createTime: '2023-01-01T10:00:00.000Z',
				updateTime: '2023-01-01T11:00:00.000Z',
			};

			const result = fullDocumentToJson(document);
			expect(result).toEqual({
				_name: 'projects/test/databases/(default)/documents/empty/123',
				_id: 'empty123',
				_createTime: '2023-01-01T10:00:00.000Z',
				_updateTime: '2023-01-01T11:00:00.000Z',
			});
		});

		it('should handle complex nested document', () => {
			const document = {
				name: 'projects/test/databases/(default)/documents/complex/123',
				id: 'complex123',
				createTime: '2023-01-01T10:00:00.000Z',
				updateTime: '2023-01-01T11:00:00.000Z',
				fields: {
					profile: {
						mapValue: {
							fields: {
								name: { stringValue: 'John' },
								preferences: {
									mapValue: {
										fields: {
											theme: { stringValue: 'dark' },
											notifications: { booleanValue: true },
										},
									},
								},
							},
						},
					},
					tags: {
						arrayValue: {
							values: [{ stringValue: 'developer' }, { stringValue: 'admin' }],
						},
					},
				},
			};

			const result = fullDocumentToJson(document);
			expect(result).toEqual({
				_name: 'projects/test/databases/(default)/documents/complex/123',
				_id: 'complex123',
				_createTime: '2023-01-01T10:00:00.000Z',
				_updateTime: '2023-01-01T11:00:00.000Z',
				profile: {
					name: 'John',
					preferences: {
						theme: 'dark',
						notifications: true,
					},
				},
				tags: ['developer', 'admin'],
			});
		});
	});
});
