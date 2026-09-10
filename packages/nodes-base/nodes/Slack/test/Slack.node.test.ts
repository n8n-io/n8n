import { Slack } from '../Slack.node';

describe('Slack', () => {
	const node = new Slack();

	it('should expose every released version and default to the latest', () => {
		expect(Object.keys(node.nodeVersions).map(Number)).toEqual([
			1, 2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7,
		]);
		expect(node.description.defaultVersion).toBe(2.7);
	});

	it('should list the same V2 versions in the version description', () => {
		const v2 = node.nodeVersions[2.6];
		expect(v2.description.version).toEqual([2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7]);
	});
});
