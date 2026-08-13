import { Spotify } from '../Spotify.node';

describe('Spotify Node Structure', () => {
	it('track operation default should be one of its options', () => {
		const operation = new Spotify().description.properties.find(
			(p) =>
				p.name === 'operation' &&
				(p.displayOptions?.show?.resource as string[] | undefined)?.includes('track'),
		);
		expect(operation).toBeDefined();

		const values = (operation?.options as Array<{ value: string }>).map((o) => o.value);
		expect(values).toContain(operation?.default);
	});
});
