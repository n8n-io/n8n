import type { IDataObject, INodePropertyOptions } from 'n8n-workflow';

import { objectOperations } from '../../ObjectDescription';

// Helper function to construct URL using the same logic as the node
function constructObjectUrl(bucketName: string, objectName: string): string {
	return `/b/${bucketName}/o/${encodeURIComponent(objectName)}`;
}

describe('Test GoogleCloudStorage, object => URL encoding', () => {
	describe('URL encoding behavior with slashes', () => {
		const testCases = [
			{
				name: 'object with forward slash (main issue case)',
				objectName: 'folder/test.jpg',
				expectedEncoded: 'folder%2Ftest.jpg',
			},
			{
				name: 'nested folder structure',
				objectName: 'folder/subfolder/test.jpg',
				expectedEncoded: 'folder%2Fsubfolder%2Ftest.jpg',
			},
			{
				name: 'object with spaces',
				objectName: 'folder with spaces/test file.jpg',
				expectedEncoded: 'folder%20with%20spaces%2Ftest%20file.jpg',
			},
			{
				name: 'simple object name (no encoding needed)',
				objectName: 'simple-file.txt',
				expectedEncoded: 'simple-file.txt',
			},
		];

		testCases.forEach(({ name, objectName, expectedEncoded }) => {
			it(`should construct correct URL for ${name}`, () => {
				const bucketName = 'test-bucket';
				const expectedUrl = `/b/${bucketName}/o/${expectedEncoded}`;

				// Test the actual URL construction logic used by the node
				const constructedUrl = constructObjectUrl(bucketName, objectName);

				expect(constructedUrl).toBe(expectedUrl);
			});

			it(`should verify node definition uses encodeURIComponent for ${name}`, () => {
				// Find the operation property that contains all the operation options
				const operationProperty = objectOperations.find(
					(prop) => prop.name === 'operation' && prop.type === 'options',
				);

				expect(operationProperty).toBeDefined();
				expect(operationProperty?.options).toBeDefined();

				// Find operations that use object URLs
				const operation = operationProperty?.options?.find((o) => o.value === 'get');

				const routing = operation?.routing as IDataObject;
				const request = routing?.request as IDataObject;
				const urlExpression = request?.url as string;

				// Verify the URL expression includes encodeURIComponent with proper template literal syntax
				expect(urlExpression).toContain('encodeURIComponent($parameter["objectName"])');

				// Verify all operations that manipulate objects use proper encoding
				const objectOperationTypes = ['get', 'delete', 'update'];
				objectOperationTypes.forEach((opType) => {
					const op = operationProperty?.options?.find((o) => o.value === opType);
					if (op?.routing) {
						const opRouting = op.routing as IDataObject;
						const opRequest = opRouting?.request as IDataObject;
						const url = opRequest?.url as string;
						// Check that the URL contains the encodeURIComponent call within the template literal
						expect(url).toContain('encodeURIComponent($parameter["objectName"])');
					}
				});
			});
		});
	});
});
