import { googleServiceAccountScopes } from '../GenericFunctions';

describe('googleServiceAccountScopes', () => {
	it('should grant the trigger scope content-read access for shared Drive files', () => {
		expect(googleServiceAccountScopes.sheetV2Trigger).toEqual([
			'https://www.googleapis.com/auth/spreadsheets',
			'https://www.googleapis.com/auth/drive.file',
			'https://www.googleapis.com/auth/drive.metadata',
			'https://www.googleapis.com/auth/drive.readonly',
		]);
	});
});
