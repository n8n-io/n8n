import { Function } from './Function.node';

describe('Function Node', () => {
	it('is marked deprecated so the backend refuses new instances', () => {
		const node = new Function();
		expect(node.description.deprecated).toBe(true);
	});
});
