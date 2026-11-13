import { workbookSearchEndpoint } from '../../helpers/workbookSearch';

describe('workbookSearchEndpoint', () => {
	it('should keep "&" and "=" unencoded in the search text', () => {
		expect(String(workbookSearchEndpoint('site-1', 'b!drive1', 'Q1 & Q2 = Budget'))).toBe(
			"/v1.0/sites/site-1/drives/b!drive1/root/search(q='Q1%20&%20Q2%20=%20Budget')",
		);
	});
});
