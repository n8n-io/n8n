import { extractID } from '../GenericFunctions';

describe('extractID', () => {
	const documentId = 'document-id_123';

	it.each([
		`https://docs.google.com/document/d/${documentId}/edit`,
		`https://docs.google.com/document/d/${documentId}`,
		`https://docs.google.com/document/d/${documentId}?tab=t.0#heading=h.123`,
		`https://drive.google.com/file/d/${documentId}/view?usp=sharing`,
		`https://drive.google.com/file/d/${documentId}`,
		`https://drive.google.com/file/d/${documentId}?usp=sharing`,
		`https://drive.google.com/open?id=${documentId}`,
		`https://drive.google.com/open?usp=sharing&id=${documentId}`,
	])('should extract the document ID from %s', (url) => {
		expect(extractID(url)).toBe(documentId);
	});

	it.each([
		documentId,
		'',
		'not a URL',
		`https://example.com/document/d/${documentId}/edit`,
		`https://docs.google.com/spreadsheets/d/${documentId}/edit`,
		'https://docs.google.com/document/d/',
		`https://docs.google.com/document/d/${documentId}.invalid/edit`,
		`https://drive.google.com/drive/folders/${documentId}`,
		'https://drive.google.com/file/d/',
		'https://drive.google.com/open',
		'https://drive.google.com/open?id=',
		`https://drive.google.com/open?id=${documentId}%2Finvalid`,
	])('should return undefined for %s', (url) => {
		expect(extractID(url)).toBeUndefined();
	});
});
