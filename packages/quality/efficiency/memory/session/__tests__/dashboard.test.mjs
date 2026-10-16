import { describe, expect, it } from 'vitest';

import { dashboardCards, normalizeDashboardLayout } from '../viewer/dashboard.mjs';

describe('stored dashboard layout', () => {
	it('uses defaults for missing, invalid, and old storage', () => {
		for (const saved of [
			undefined,
			null,
			'invalid',
			{ version: 0, cards: [] },
			{ version: 1, cards: null },
		]) {
			const layout = normalizeDashboardLayout(saved);
			expect(layout).toHaveLength(dashboardCards.length);
			expect(layout[0]).toEqual({ id: 'timeline-section', x: 0, y: 0, w: 12, h: 8, hidden: false });
		}
	});

	it('keeps known visibility and dimensions while rejecting unknown cards', () => {
		const layout = normalizeDashboardLayout({
			version: 1,
			cards: [
				{ id: 'timeline-section', x: 2, y: 5, w: 8, h: 9, hidden: true },
				{ id: 'untrusted', hidden: true },
				{ id: 'controls', w: 12 },
			],
		});
		expect(layout[0]).toEqual({ id: 'timeline-section', x: 2, y: 5, w: 8, h: 9, hidden: true });
		expect(layout.some((card) => card.id === 'untrusted')).toBe(false);
		expect(layout[1].hidden).toBe(false);
		expect(layout.find((card) => card.id === 'controls').x).toBe(0);
	});

	it('bounds positions and sizes and ignores noninteger values', () => {
		const layout = normalizeDashboardLayout({
			version: 1,
			cards: [
				{ id: 'timeline-section', x: 900, y: -1, w: 100, h: 0, hidden: 'true' },
				{ id: 'requests-section', x: -3, y: Infinity, w: 1.5, h: 900 },
			],
		});
		expect(layout[0]).toEqual({ id: 'timeline-section', x: 0, y: 0, w: 12, h: 6, hidden: false });
		expect(layout.find((card) => card.id === 'requests-section')).toEqual({
			id: 'requests-section',
			x: 0,
			y: 8,
			w: 12,
			h: 100,
			hidden: false,
		});
	});
});
