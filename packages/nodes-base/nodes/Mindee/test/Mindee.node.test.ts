import { Mindee } from '../Mindee.node';
import { MindeeV1 } from '../v1/MindeeV1.node';
import { MindeeV2 } from '../v2/MindeeV2.node';

describe('Mindee', () => {
	const node = new Mindee();

	it('should default to the Mindee V2 API version', () => {
		expect(node.description.defaultVersion).toBe(4);
		expect(node.getNodeType()).toBeInstanceOf(MindeeV2);
	});

	it.each([1, 2, 3])('should use the legacy node for version %s', (version) => {
		expect(node.getNodeType(version)).toBeInstanceOf(MindeeV1);
	});

	it('should use the Mindee V2 node for version 4', () => {
		expect(node.getNodeType(4)).toBeInstanceOf(MindeeV2);
	});
});
