import { Postgres } from '../Postgres.node';
import { PostgresV2 } from '../v2/PostgresV2.node';

describe('Postgres', () => {
	const node = new Postgres();
	const versions = Object.keys(node.nodeVersions).map(Number);

	it('should expose every released version and default to the latest', () => {
		expect(versions).toEqual([1, 2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9]);
		expect(node.description.defaultVersion).toBe(2.9);
		expect(node.currentVersion).toBe(2.9);
	});

	it('should list the same V2 versions in the version description', () => {
		const v2Versions = versions.filter(
			(version) => node.nodeVersions[version] instanceof PostgresV2,
		);

		expect(node.nodeVersions[2.9].description.version).toEqual(v2Versions);
	});
});
