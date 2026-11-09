import { hasPolicyRefusalMarker } from '../../src/errors';

describe('hasPolicyRefusalMarker', () => {
	it('recognises an error that carries the marker as an own property', () => {
		const refusal = Object.assign(new Error('Blocked'), { isPolicyRefusal: true });

		expect(hasPolicyRefusalMarker(refusal)).toBe(true);
	});

	it('does not recognise an inherited marker', () => {
		const inherited = Object.create({ isPolicyRefusal: true }) as object;

		expect(hasPolicyRefusalMarker(inherited)).toBe(false);
	});

	it.each([
		['an ordinary error', new Error('boom')],
		['a non-true marker', { isPolicyRefusal: 'yes' }],
		['null', null],
		['undefined', undefined],
	])('does not recognise %s', (_label, value) => {
		expect(hasPolicyRefusalMarker(value)).toBe(false);
	});
});
