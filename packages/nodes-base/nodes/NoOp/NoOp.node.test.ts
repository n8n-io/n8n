import { getNodeParameters } from 'n8n-workflow';

import { NoOp } from './NoOp.node';

describe('NoOp', () => {
	const node = new NoOp();

	it('preserves the empty-group anchor marker', () => {
		const parameters = getNodeParameters(
			node.description.properties,
			{ emptyGroupAnchor: true },
			false,
			false,
			{ typeVersion: 1 },
			node.description,
		);

		expect(parameters).toEqual({ emptyGroupAnchor: true });
	});

	it('keeps ordinary NoOp parameters empty', () => {
		const parameters = getNodeParameters(
			node.description.properties,
			{},
			false,
			false,
			{ typeVersion: 1 },
			node.description,
		);

		expect(parameters).toEqual({});
	});
});
