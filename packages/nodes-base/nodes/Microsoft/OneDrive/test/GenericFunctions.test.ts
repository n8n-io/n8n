import get from 'lodash/get';
import type { IExecuteFunctions, INode, IPollFunctions, IWorkflowMetadata } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import {
	microsoftApiRequest,
	getPath,
	getOneDriveCredentialType,
	validateOneDriveFileName,
} from '../GenericFunctions';

describe('Microsoft OneDrive GenericFunctions', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockRequestOAuth2: Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockRequestOAuth2 = vi.fn();
		mockExecuteFunctions.helpers.requestOAuth2 = mockRequestOAuth2;

		mockNode = {
			id: 'test-node',
			name: 'Test OneDrive Node',
			type: 'n8n-nodes-base.microsoftOneDrive',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getWorkflow.mockReturnValue({
			id: 'test-workflow-id',
		} as IWorkflowMetadata);
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('microsoftApiRequest', () => {
		describe('graphApiBaseUrl from credentials', () => {
			it('should use base URL from credentials', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/v1.0/me/drive',
						json: true,
					}),
				);
			});

			it('should fall back to default when credentials.graphApiBaseUrl is empty', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: '',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/drive',
						json: true,
					}),
				);
			});

			it('should fall back to default when credentials.graphApiBaseUrl is undefined', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/drive',
						json: true,
					}),
				);
			});

			it('should strip trailing slashes from base URL using regex', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.com/',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/drive',
						json: true,
					}),
				);
			});

			it('should strip multiple trailing slashes from base URL', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.com///',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/drive',
						json: true,
					}),
				);
			});

			it('should use US Government cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/v1.0/me/drive',
						json: true,
					}),
				);
			});

			it('should use US Government DOD cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://dod-graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://dod-graph.microsoft.us/v1.0/me/drive',
						json: true,
					}),
				);
			});

			it('should use China cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://microsoftgraph.chinacloudapi.cn',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://microsoftgraph.chinacloudapi.cn/v1.0/me/drive',
						json: true,
					}),
				);
			});
		});
	});

	describe('credential type selection', () => {
		beforeEach(() => {
			mockRequestOAuth2.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				oauthTokenData: { access_token: 'test-access-token' },
			});
		});

		it('should use the generic microsoftOAuth2Api credential when selected', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
			expect(mockRequestOAuth2).toHaveBeenCalledWith('microsoftOAuth2Api', expect.anything());
		});

		it('should use the microsoftOneDriveOAuth2Api credential when selected', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOneDriveOAuth2Api');

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
				'microsoftOneDriveOAuth2Api',
			);
			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOneDriveOAuth2Api',
				expect.anything(),
			);
		});

		it('should fall back to microsoftOneDriveOAuth2Api when authentication is not set', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
				'microsoftOneDriveOAuth2Api',
			);
			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOneDriveOAuth2Api',
				expect.anything(),
			);
		});

		it('should fall back to microsoftOneDriveOAuth2Api when authentication is an empty string', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('');

			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/drive');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
				'microsoftOneDriveOAuth2Api',
			);
			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOneDriveOAuth2Api',
				expect.anything(),
			);
		});
	});

	describe('getPath', () => {
		describe('graphApiBaseUrl from credentials', () => {
			it('should use base URL from credentials', async () => {
				const mockResponse = {
					name: 'test-item',
					folder: {},
					parentReference: { path: '/drive/root:/folder' },
				};
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await getPath.call(mockExecuteFunctions, 'item-id-123');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/v1.0/me/drive/items/item-id-123',
						json: true,
					}),
				);
			});

			it('should fall back to default when credentials.graphApiBaseUrl is empty', async () => {
				const mockResponse = {
					name: 'test-item',
					folder: {},
					parentReference: { path: '/drive/root:/folder' },
				};
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: '',
				});

				await getPath.call(mockExecuteFunctions, 'item-id-123');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/drive/items/item-id-123',
						json: true,
					}),
				);
			});

			it('should strip trailing slashes from base URL using regex', async () => {
				const mockResponse = {
					name: 'test-item',
					folder: {},
					parentReference: { path: '/drive/root:/folder' },
				};
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.com/',
				});

				await getPath.call(mockExecuteFunctions, 'item-id-123');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOneDriveOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/me/drive/items/item-id-123',
						json: true,
					}),
				);
			});
		});

		describe('credential type selection', () => {
			it('should use the generic microsoftOAuth2Api credential when selected', async () => {
				const mockResponse = {
					name: 'test-item',
					folder: {},
					parentReference: { path: '/drive/root:/folder' },
				};
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: { access_token: 'test-access-token' },
				});

				await getPath.call(mockExecuteFunctions, 'item-id-123');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith('microsoftOAuth2Api', expect.anything());
			});
		});
	});

	describe('getOneDriveCredentialType context semantics', () => {
		const savedParameters = {}; // pre-existing node: no `authentication` persisted

		it('resolves the default credential in EXECUTE context (node)', () => {
			// signature: (name, itemIndex, fallbackValue, options) - see execute-context.ts
			const executeCtx = {
				getNodeParameter: (name: string, _itemIndex: number, fallbackValue?: unknown) =>
					get(savedParameters, name, fallbackValue),
			} as IExecuteFunctions;

			expect(getOneDriveCredentialType.call(executeCtx)).toBe('microsoftOneDriveOAuth2Api');
		});

		it('resolves the default credential in POLL context (trigger)', () => {
			// signature: (name, fallbackValue, options) - see node-execution-context.ts
			const pollCtx = {
				getNodeParameter: (name: string, fallbackValue?: unknown) =>
					get(savedParameters, name, fallbackValue),
			} as IPollFunctions;

			expect(getOneDriveCredentialType.call(pollCtx)).toBe('microsoftOneDriveOAuth2Api');
		});
	});

	describe('validateOneDriveFileName', () => {
		it('accepts a legal file name', () => {
			expect(() => validateOneDriveFileName(mockNode, 'report.txt', 0)).not.toThrow();
		});

		it.each([undefined, '', '   '])('rejects a missing or blank name (%p)', (name) => {
			expect(() => validateOneDriveFileName(mockNode, name, 0)).toThrow('File name must be set');
		});

		it('names the colon and suggests a colon-free timestamp format', () => {
			let caught: Error | undefined;
			try {
				validateOneDriveFileName(mockNode, 'report-2026-06-10T12:34:56.789Z.txt', 3);
			} catch (error) {
				caught = error as Error;
			}

			expect(caught?.message).toContain("contains characters that OneDrive doesn't allow");
			expect(caught?.message).toContain(':');
			expect((caught as { description?: string })?.description).toContain(
				"$now.toFormat('yyyy-MM-dd_HH-mm-ss')",
			);
		});

		it('names every disallowed character present', () => {
			let caught: Error | undefined;
			try {
				validateOneDriveFileName(mockNode, 'a:b/c?.txt', 0);
			} catch (error) {
				caught = error as Error;
			}

			expect(caught?.message).toContain(':');
			expect(caught?.message).toContain('/');
			expect(caught?.message).toContain('?');
		});

		it('omits the timestamp suggestion when the illegal name has no colon', () => {
			let caught: Error | undefined;
			try {
				validateOneDriveFileName(mockNode, 'bad*name?.txt', 0);
			} catch (error) {
				caught = error as Error;
			}

			expect(caught?.message).toContain("contains characters that OneDrive doesn't allow");
			expect((caught as { description?: string })?.description).not.toContain('$now.toFormat');
		});
	});
});
