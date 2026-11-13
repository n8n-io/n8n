import type { IExecuteFunctions } from 'n8n-workflow';

import { googleApiRequest } from '../../v1/GenericFunctions';
import { GoogleSheet } from '../../v1/GoogleSheet';

vi.mock('../../v1/GenericFunctions', () => ({
	googleApiRequest: { call: vi.fn() },
}));

describe('GoogleSheet v1', () => {
	it('should encode path values that contain a slash', async () => {
		const sheet = new GoogleSheet('1kZ8/files', {} as IExecuteFunctions);
		await sheet.clearData('Q3/Orders!A1/B2:C3');

		expect(String(vi.mocked(googleApiRequest.call).mock.calls[0][2])).toBe(
			'/v4/spreadsheets/1kZ8%2Ffiles/values/Q3%2FOrders!A1%2FB2:C3:clear',
		);
	});

	it('should reject a spreadsheet ID with a dot segment', async () => {
		const sheet = new GoogleSheet('1kZ8/../files', {} as IExecuteFunctions);

		await expect(sheet.clearData('Q3!A1:B2')).rejects.toThrow('Invalid identifier');
	});
});
