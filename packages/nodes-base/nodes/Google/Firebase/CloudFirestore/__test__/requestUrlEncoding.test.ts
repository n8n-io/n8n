import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { GoogleFirebaseCloudFirestore } from '../GoogleFirebaseCloudFirestore.node';

describe('GoogleFirebaseCloudFirestore - request URL encoding', () => {
	it('should encode a project ID with a slash as one path segment', async () => {
		const params: IDataObject = {
			authentication: 'googleFirebaseCloudFirestoreOAuth2Api',
			resource: 'collection',
			operation: 'getAll',
			projectId: 'test-project/other-project',
			database: '(default)',
			returnAll: false,
			limit: 2,
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.requestWithAuthentication.mockResolvedValue({ collectionIds: [] });

		await new GoogleFirebaseCloudFirestore().execute.call(context);

		const [, options] = context.helpers.requestWithAuthentication.mock.calls[0];
		expect(String((options as IDataObject).uri)).toBe(
			'https://firestore.googleapis.com/v1/projects/test-project%2Fother-project/databases/(default)/documents:listCollectionIds',
		);
	});

	it('should reject a project ID with a dot segment', async () => {
		const params: IDataObject = {
			authentication: 'googleFirebaseCloudFirestoreOAuth2Api',
			resource: 'collection',
			operation: 'getAll',
			projectId: 'test-project/../other-project',
			database: '(default)',
			returnAll: false,
			limit: 2,
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.requestWithAuthentication.mockResolvedValue({ collectionIds: [] });

		await expect(new GoogleFirebaseCloudFirestore().execute.call(context)).rejects.toThrow(
			'Invalid identifier',
		);
		expect(context.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});

	describe.each([
		[1.1, 'users/uid%201/a%2Fb', 'doc%23id', 'users/uid%201/a%2Fb', 'doc%23id'],
		[1.2, 'users/uid%201/a%2Fb', 'doc%23id', 'users/uid%25201/a%252Fb', 'doc%2523id'],
	])('version %s', (typeVersion, collection, documentId, collectionPath, documentPath) => {
		const run = async (operation: string) => {
			const params: IDataObject = {
				authentication: 'googleFirebaseCloudFirestoreOAuth2Api',
				resource: 'document',
				operation,
				projectId: 'test-project',
				database: '(default)',
				collection,
				documentId,
				returnAll: false,
				limit: 2,
				simple: false,
			};
			const context = mockDeep<IExecuteFunctions>();
			context.getInputData.mockReturnValue([{ json: {} }]);
			context.getNode.mockReturnValue(mock<INode>({ typeVersion }));
			context.getNodeParameter.mockImplementation((name: string) => params[name]);
			context.helpers.constructExecutionMetaData.mockReturnValue([]);
			context.helpers.requestWithAuthentication.mockResolvedValue({ documents: [] });

			await new GoogleFirebaseCloudFirestore().execute.call(context);

			const [, options] = context.helpers.requestWithAuthentication.mock.calls[0];
			return String((options as IDataObject).uri);
		};
		const base =
			'https://firestore.googleapis.com/v1/projects/test-project/databases/(default)/documents/';

		it('should build the collection path for getAll', async () => {
			expect(await run('getAll')).toBe(`${base}${collectionPath}`);
		});

		it('should build the document path for delete', async () => {
			expect(await run('delete')).toBe(`${base}${collectionPath}/${documentPath}`);
		});
	});

	describe('document delete with path-like values', () => {
		const runDelete = async (collection: string, documentId: string) => {
			const params: IDataObject = {
				authentication: 'googleFirebaseCloudFirestoreOAuth2Api',
				resource: 'document',
				operation: 'delete',
				projectId: 'p',
				database: '(default)',
				collection,
				documentId,
			};
			const context = mockDeep<IExecuteFunctions>();
			context.getInputData.mockReturnValue([{ json: {} }]);
			context.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.2 }));
			context.getNodeParameter.mockImplementation((name: string) => params[name]);
			context.helpers.constructExecutionMetaData.mockReturnValue([]);
			context.helpers.requestWithAuthentication.mockResolvedValue({});

			await new GoogleFirebaseCloudFirestore().execute.call(context);
			return context.helpers.requestWithAuthentication;
		};

		it('should encode a document ID with a slash as one path segment', async () => {
			const request = await runDelete('users', 'a/x');

			const [, options] = request.mock.calls[0];
			expect(String((options as IDataObject).uri)).toBe(
				'https://firestore.googleapis.com/v1/projects/p/databases/(default)/documents/users/a%2Fx',
			);
		});

		it.each([
			['users', '..'],
			['users', '../x'],
			['users/../x', 'doc'],
		])('should reject collection %s with document ID %s', async (collection, documentId) => {
			const context = mockDeep<IExecuteFunctions>();
			const params: IDataObject = {
				authentication: 'googleFirebaseCloudFirestoreOAuth2Api',
				resource: 'document',
				operation: 'delete',
				projectId: 'p',
				database: '(default)',
				collection,
				documentId,
			};
			context.getInputData.mockReturnValue([{ json: {} }]);
			context.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.2 }));
			context.getNodeParameter.mockImplementation((name: string) => params[name]);

			await expect(new GoogleFirebaseCloudFirestore().execute.call(context)).rejects.toThrow(
				'Invalid identifier',
			);
			expect(context.helpers.requestWithAuthentication).not.toHaveBeenCalled();
		});
	});
});
