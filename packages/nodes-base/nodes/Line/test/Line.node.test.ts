import { Line } from '../Line.node';

describe('Line Node', () => {
	const node = new Line();

	it('should be hidden from the nodes panel', () => {
		// The node talks to LINE Notify, which the upstream provider shut down.
		// `hidden` is the flag the editor and the node catalog filter on, so a
		// retired node stays out of the panel and out of node search.
		expect(node.description.hidden).toBe(true);
	});

	it('should keep working for workflows that already use it', () => {
		// Hidden means "not offered to new workflows", not "removed". The node
		// must keep its name, version and credential so saved workflows still run.
		expect(node.description.name).toBe('line');
		expect(node.description.version).toBe(1);
		expect(node.description.credentials?.[0].name).toBe('lineNotifyOAuth2Api');
		expect(typeof node.execute).toBe('function');
	});
});
