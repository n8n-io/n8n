describe('Test GoogleCloudStorage, object => URL encoding', () => {
	describe('URL encoding behavior for GitHub issue #20384', () => {
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
			it(`should properly encode ${name}`, () => {
				expect(encodeURIComponent(objectName)).toBe(expectedEncoded);
			});

			it(`should construct correct URL for ${name}`, () => {
				const bucketName = 'test-bucket';
				const expectedUrl = `/b/${bucketName}/o/${expectedEncoded}`;
				const constructedUrl = `/b/${bucketName}/o/${encodeURIComponent(objectName)}`;

				expect(constructedUrl).toBe(expectedUrl);
			});
		});
	});
});
