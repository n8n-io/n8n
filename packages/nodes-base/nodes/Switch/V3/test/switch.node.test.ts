import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { INodeTypeBaseDescription } from 'n8n-workflow';

import { SwitchV3 } from '../SwitchV3.node';

describe('Execute Switch Node', () => {
	new NodeTestHarness().setupTests();

	describe('Version-specific behavior', () => {
		it('should have two numberOutputs parameters with different version conditions', () => {
			const baseDescription: INodeTypeBaseDescription = {
				displayName: 'Switch',
				name: 'n8n-nodes-base.switch',
				group: ['transform'],
				description: 'Route items to different outputs',
			};

			const switchNode = new SwitchV3(baseDescription);
			const numberOutputsParams = switchNode.description.properties.filter(
				(prop) => prop.name === 'numberOutputs',
			);

			expect(numberOutputsParams).toHaveLength(2);
		});

		it('should have noDataExpression: true for version 3.3+ numberOutputs parameter', () => {
			const baseDescription: INodeTypeBaseDescription = {
				displayName: 'Switch',
				name: 'n8n-nodes-base.switch',
				group: ['transform'],
				description: 'Route items to different outputs',
			};

			const switchNode = new SwitchV3(baseDescription);
			const numberOutputsParamWithNoExpression = switchNode.description.properties.find(
				(prop) => prop.name === 'numberOutputs' && prop.noDataExpression === true,
			);

			expect(numberOutputsParamWithNoExpression).toBeDefined();
			expect(numberOutputsParamWithNoExpression?.noDataExpression).toBe(true);
		});

		it('should have numberOutputs parameter without noDataExpression for older versions', () => {
			const baseDescription: INodeTypeBaseDescription = {
				displayName: 'Switch',
				name: 'n8n-nodes-base.switch',
				group: ['transform'],
				description: 'Route items to different outputs',
			};

			const switchNode = new SwitchV3(baseDescription);
			const numberOutputsParamWithoutNoExpression = switchNode.description.properties.find(
				(prop) => prop.name === 'numberOutputs' && !prop.noDataExpression,
			);

			expect(numberOutputsParamWithoutNoExpression).toBeDefined();
			expect(numberOutputsParamWithoutNoExpression?.noDataExpression).toBeUndefined();
		});

		it('should include version 3.3 in supported versions', () => {
			const baseDescription: INodeTypeBaseDescription = {
				displayName: 'Switch',
				name: 'n8n-nodes-base.switch',
				group: ['transform'],
				description: 'Route items to different outputs',
			};

			const switchNode = new SwitchV3(baseDescription);
			expect(switchNode.description.version).toContain(3.3);
		});
	});
});
