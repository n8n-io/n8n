import { describe, expect, it } from 'vitest';

import { buildMentionsList } from '../actions/update/update.execute';

describe('buildMentionsList', () => {
	it('maps user and team IDs to typed mentions', () => {
		expect(buildMentionsList(['1', '2'], ['30'])).toEqual([
			{ id: '1', type: 'User' },
			{ id: '2', type: 'User' },
			{ id: '30', type: 'Team' },
		]);
	});

	it('accepts CSV strings from expression mode', () => {
		expect(buildMentionsList('1, 2', '')).toEqual([
			{ id: '1', type: 'User' },
			{ id: '2', type: 'User' },
		]);
	});

	it('returns an empty list when nothing is selected', () => {
		expect(buildMentionsList(undefined, undefined)).toEqual([]);
		expect(buildMentionsList([], '')).toEqual([]);
	});
});
