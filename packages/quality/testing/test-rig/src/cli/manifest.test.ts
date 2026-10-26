import { loadManifest } from './manifest';

describe('manifest', () => {
	it('loads the repository manifest and finds every spec', () => {
		expect(Object.keys(loadManifest()).length).toBeGreaterThan(0);
	});
});
