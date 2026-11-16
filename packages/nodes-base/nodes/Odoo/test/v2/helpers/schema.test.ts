import { DateTime } from 'luxon';
import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { createDateFieldFormatter } from '../../../v2/helpers/schema';
import * as transport from '../../../v2/transport';

vi.mock('../../../v2/transport', () => ({
	odooApiRequest: vi.fn(),
}));

describe('createDateFieldFormatter', () => {
	const exec = mock<IExecuteFunctions>();

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('does not request the schema when no value can be a date', async () => {
		const formatDateFields = createDateFieldFormatter(exec);

		const result = await formatDateFields('res.partner', {
			name: 'Acme Corp',
			date: '2026-07-14 12:00:00',
		});

		expect(transport.odooApiRequest).not.toHaveBeenCalled();
		expect(result).toEqual({ name: 'Acme Corp', date: '2026-07-14 12:00:00' });
	});

	it('requests the schema once for each model and converts date values', async () => {
		(transport.odooApiRequest as Mock).mockResolvedValue({ start: { type: 'datetime' } });
		const formatDateFields = createDateFieldFormatter(exec);
		const start = DateTime.fromISO('2026-07-14T12:00:00.000+02:00', { setZone: true });

		const first = await formatDateFields('calendar.event', { start });
		const second = await formatDateFields('calendar.event', { start });
		await formatDateFields('crm.lead', { start });

		expect(first.start).toBe('2026-07-14 10:00:00');
		expect(second.start).toBe('2026-07-14 10:00:00');
		expect(transport.odooApiRequest).toHaveBeenCalledTimes(2);
		expect(transport.odooApiRequest).toHaveBeenNthCalledWith(1, 'calendar.event', 'fields_get', {
			attributes: ['type'],
		});
		expect(transport.odooApiRequest).toHaveBeenNthCalledWith(2, 'crm.lead', 'fields_get', {
			attributes: ['type'],
		});
	});

	it('requests the schema again after a failed request', async () => {
		(transport.odooApiRequest as Mock)
			.mockRejectedValueOnce(new Error('Odoo error'))
			.mockResolvedValue({ start: { type: 'datetime' } });
		const formatDateFields = createDateFieldFormatter(exec);
		const fields = { start: '2026-07-14T08:30:00Z' };

		await expect(formatDateFields('calendar.event', fields)).rejects.toThrow('Odoo error');
		const result = await formatDateFields('calendar.event', fields);

		expect(result.start).toBe('2026-07-14 08:30:00');
		expect(transport.odooApiRequest).toHaveBeenCalledTimes(2);
	});
});
