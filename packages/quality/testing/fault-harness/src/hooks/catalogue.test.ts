import { olderThan } from './catalogue';

describe('olderThan', () => {
	it('compares release tags by number, not as text', () => {
		expect(olderThan('2.9.0', '2.39.0')).toBe(true);
	});
});
