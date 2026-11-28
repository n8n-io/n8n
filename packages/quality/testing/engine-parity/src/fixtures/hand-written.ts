import { toParityCase } from '../grammar/arbitrary';
import type { IrItem, IrNode, IrWorkflow, ParityCase } from '../grammar/ir';

/**
 * Hand-written cases, ported from the engine v2 acceptance tests in
 * `@n8n/node-engine-compatibility`. They show that both runners run the same
 * workflow, and they check the runners when the generator is not involved.
 */

const trigger: IrNode = { key: 'Trigger', catalogId: 'trigger.manual', params: {}, via: 'trigger' };

function set(key: string, fields: Record<string, string | number>): IrNode {
	return {
		key,
		catalogId: 'set.manual',
		via: 'chain',
		params: {
			mode: 'manual',
			assignments: {
				assignments: Object.entries(fields).map(([name, value], i) => ({
					id: `a${i}`,
					name,
					value,
					type: typeof value === 'number' ? 'number' : 'string',
				})),
			},
			includeOtherFields: false,
			options: {},
		},
	};
}

function chain(...keys: string[]) {
	return keys.slice(1).map((to, i) => ({ from: keys[i], out: 0, to, in: 0 }));
}

function build(nodes: IrNode[], edges: IrWorkflow['edges'], items: IrItem[]): ParityCase {
	return toParityCase({
		triggers: [trigger],
		nodes,
		edges,
		triggerItems: items,
		firedTrigger: 'Trigger',
	});
}

const loopNode: IrNode = {
	key: 'Loop',
	catalogId: 'splitInBatches',
	params: { batchSize: 1, options: {} },
	via: 'loop',
};

export const handWrittenCases: Record<string, ParityCase> = {
	'linear pipeline with references': build(
		[
			set('A', { a: '={{ $json.seed }}-a' }),
			set('B', { b: '={{ $json.a }}-b' }),
			set('C', { c: '={{ $json.b }}-c', fromA: "={{ $('A').first().json.a }}" }),
		],
		chain('Trigger', 'A', 'B', 'C'),
		[{ json: { seed: 's' } }],
	),

	'split out into a set': build(
		[
			{
				key: 'Split Out',
				catalogId: 'splitOut',
				params: { fieldToSplitOut: 'orders', include: 'noOtherFields', options: {} },
				via: 'chain',
			},
			set('Mark', { marked: '={{ $json.n }}!' }),
		],
		chain('Trigger', 'Split Out', 'Mark'),
		[{ json: { orders: [{ n: 1 }, { n: 2 }, { n: 3 }] } }],
	),

	'reference to a node that does not exist': build(
		[set('A', { boom: "={{ $('Ghost').first().json.x }}" }), set('B', { b: 'never' })],
		chain('Trigger', 'A', 'B'),
		[{ json: { name: 'ada' } }],
	),

	'if into merge': build(
		[
			{
				key: 'If',
				catalogId: 'if.condition',
				via: 'branch',
				params: {
					conditions: {
						options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
						conditions: [
							{
								id: 'c0',
								leftValue: '={{ $json.n }}',
								rightValue: 1,
								operator: { type: 'number', operation: 'gt' },
							},
						],
						combinator: 'and',
					},
					looseTypeValidation: true,
					options: {},
				},
			},
			set('Big', { size: 'big' }),
			set('Small', { size: 'small' }),
			{
				key: 'Join',
				catalogId: 'merge.append',
				params: { mode: 'append', numberInputs: 2 },
				via: 'merge',
			},
		],
		[
			{ from: 'Trigger', out: 0, to: 'If', in: 0 },
			{ from: 'If', out: 0, to: 'Big', in: 0 },
			{ from: 'If', out: 1, to: 'Small', in: 0 },
			{ from: 'Big', out: 0, to: 'Join', in: 0 },
			{ from: 'Small', out: 0, to: 'Join', in: 1 },
		],
		[{ json: { n: 0 } }, { json: { n: 2 } }, { json: { n: 3 } }],
	),

	// The item from input 1 of the Merge traces back past the trigger, not to "A".
	'reference across a merge to the other branch': build(
		[
			set('A', { a: 'from A' }),
			{
				key: 'Join',
				catalogId: 'merge.append',
				params: { mode: 'append', numberInputs: 2 },
				via: 'merge',
			},
			set('Use', { fromA: "={{ $('A').item.json.a }}" }),
		],
		[
			{ from: 'Trigger', out: 0, to: 'A', in: 0 },
			{ from: 'A', out: 0, to: 'Join', in: 0 },
			{ from: 'Trigger', out: 0, to: 'Join', in: 1 },
			{ from: 'Join', out: 0, to: 'Use', in: 0 },
		],
		[{ json: { n: 1 } }],
	),

	'loop over items': build(
		[loopNode, set('Body', { pass: '={{ $runIndex }}' }), set('After', { ran: 'yes' })],
		[
			{ from: 'Trigger', out: 0, to: 'Loop', in: 0 },
			{ from: 'Loop', out: 1, to: 'Body', in: 0 },
			{ from: 'Body', out: 0, to: 'Loop', in: 0 },
			{ from: 'Loop', out: 0, to: 'After', in: 0 },
		],
		[{ json: { n: 1 } }, { json: { n: 2 } }, { json: { n: 3 } }],
	),
};
