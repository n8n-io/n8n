import { normalizeTimelessDates } from '../../../shared/GenericFunctions';

describe('Linear v2 → normalizeTimelessDates', () => {
	it('trims an ISO timestamp to the TimelessDate format', () => {
		const fields = { dueDate: '2026-03-01T14:30:00.000Z', name: 'Untouched' };

		normalizeTimelessDates(fields);

		expect(fields).toEqual({ dueDate: '2026-03-01', name: 'Untouched' });
	});

	it('converts Date values coming from expressions', () => {
		const fields = { targetDate: new Date('2026-03-01T14:30:00.000Z') };

		normalizeTimelessDates(fields);

		expect(fields.targetDate).toBe('2026-03-01');
	});

	it('leaves already-timeless dates and absent fields alone', () => {
		const fields = { targetDate: '2026-03-01' };

		normalizeTimelessDates(fields);

		expect(fields).toEqual({ targetDate: '2026-03-01' });
	});
});
