import { filterStatuses } from '../WhatsAppTrigger.node';

describe('filterStatuses', () => {
	const mockEvents = [
		{ statuses: [{ status: 'deleted' }] },
		{ statuses: [{ status: 'delivered' }] },
		{ statuses: [{ status: 'failed' }] },
		{ statuses: [{ status: 'read' }] },
		{ statuses: [{ status: 'sent' }] },
	];

	test('returns events with no statuses when allowedStatuses is empty', () => {
		expect(filterStatuses(mockEvents, [])).toEqual([]);
	});

	test("returns all events when 'all' is in allowedStatuses", () => {
		expect(filterStatuses(mockEvents, ['all'])).toEqual(mockEvents);
	});

	test('filters events correctly when specific statuses are provided', () => {
		expect(filterStatuses(mockEvents, ['deleted', 'read'])).toEqual([
			{ statuses: [{ status: 'deleted' }] },
			{ statuses: [{ status: 'read' }] },
		]);
	});

	test('returns only event with matching status', () => {
		expect(filterStatuses(mockEvents, ['failed'])).toEqual([{ statuses: [{ status: 'failed' }] }]);
	});

	test('returns unchanged event when allowedStatuses is undefined', () => {
		expect(filterStatuses(mockEvents, undefined)).toEqual(mockEvents);
	});
});
