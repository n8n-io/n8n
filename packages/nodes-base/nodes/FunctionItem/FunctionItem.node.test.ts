import { FunctionItem } from './FunctionItem.node';

describe('FunctionItem Node', () => {
	it('is marked deprecated so the backend refuses new instances', () => {
		const node = new FunctionItem();
		expect(node.description.deprecated).toBe(true);
	});
});
