import {
	COMPOSITE_ENTRY_NODE_TYPE,
	COMPOSITE_EXIT_NODE_TYPE,
	expandCompositeNode,
	expandComposites,
	exposeProperties,
	type CompositeNodeType,
} from '../src/composite-node';
import type { IConnections, INode, INodeType, INodeTypes } from '../src/interfaces';
import { NodeConnectionTypes } from '../src/interfaces';

/** Request -> exit, repeated `attempts` times, with a check between that routes "done" out. */
class Repeat implements CompositeNodeType {
	description: CompositeNodeType['description'] = {
		displayName: 'Repeat',
		name: 'repeat',
		group: ['transform'],
		version: 1,
		description: '',
		defaults: { name: 'Repeat' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		properties: [
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
			{ displayName: 'Attempts', name: 'attempts', type: 'number', default: 2 },
			{ displayName: 'Done When', name: 'doneWhen', type: 'string', default: '' },
		],
	};

	composite: CompositeNodeType['composite'] = {
		expand: (c) => {
			const attempts = c.literal<number>('attempts');
			const done = c.exit({ output: 0 });
			const timedOut = c.exit({ error: 'gave up' });
			let previous = c.entry;
			for (let attempt = 1; attempt <= attempts; attempt++) {
				const request = c.addNode(`request ${attempt}`, {
					type: 'test.request',
					typeVersion: 1,
					parameters: c.inputParameters(['url']),
					credentials: c.credentials(),
				});
				const check = c.addNode(`check ${attempt}`, {
					type: 'test.check',
					typeVersion: 1,
					parameters: { when: c.innerParameter('doneWhen') },
				});
				c.connect(previous, request);
				c.connect(request, check);
				c.connect(check.output(0), done);
				if (attempt === attempts) c.connect(check.output(1), timedOut);
				previous = check;
			}
		},
	};
}

const plain = (name: string): INodeType => ({
	description: { ...new Repeat().description, name, properties: [] },
});

const nodeTypes: INodeTypes = {
	getByName: () => new Repeat(),
	getByNameAndVersion: (type) => (type === 'test.repeat' ? new Repeat() : plain(type)),
	getKnownTypes: () => ({}),
};

const node = (name: string, type: string, parameters: INode['parameters'] = {}): INode => ({
	id: name.toLowerCase(),
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters,
});

const main = (...targets: Array<[string, number]>) => ({
	main: [targets.map(([target, index]) => ({ node: target, type: 'main' as const, index }))],
});

describe('expandComposites', () => {
	const workflow = (repeat: INode) => ({
		nodes: [node('Start', 'test.start'), repeat, node('After', 'test.after')],
		connections: {
			Start: main(['Repeat', 0]),
			Repeat: main(['After', 0]),
		} as IConnections,
	});

	it('leaves a workflow without composite nodes unchanged', () => {
		const nodes = [node('Start', 'test.start'), node('After', 'test.after')];
		const connections: IConnections = { Start: main(['After', 0]) };

		const expanded = expandComposites({ nodes, connections }, nodeTypes);

		expect(expanded.nodes).toEqual(nodes);
		expect(expanded.connections).toEqual(connections);
		expect(expanded.scopes.size).toBe(0);
	});

	it('replaces the composite with an entry, the inner nodes and an exit that keeps its name', () => {
		const repeat = {
			...node('Repeat', 'test.repeat', { url: 'https://x.test', attempts: 2 }),
			credentials: { httpHeaderAuth: { id: '1', name: 'Auth' } },
			continueOnFail: true,
		};

		const expanded = expandComposites(workflow(repeat), nodeTypes);

		expect(expanded.nodes.map((n) => [n.name, n.type])).toEqual([
			['Start', 'test.start'],
			['Repeat › entry', COMPOSITE_ENTRY_NODE_TYPE],
			['Repeat › request 1', 'test.request'],
			['Repeat › check 1', 'test.check'],
			['Repeat › request 2', 'test.request'],
			['Repeat › check 2', 'test.check'],
			['Repeat', COMPOSITE_EXIT_NODE_TYPE],
			['After', 'test.after'],
		]);

		const exit = expanded.nodes.find((n) => n.name === 'Repeat');
		expect(exit).toMatchObject({ id: 'repeat', continueOnFail: true });
		expect(exit?.credentials).toBeUndefined();
		// input 0 is the entry anchor, 1-2 are the done inputs, 3 is the timeout
		expect(exit?.parameters).toEqual({
			inputCount: 4,
			outputCount: 1,
			layout: JSON.stringify([
				{ output: 0, inputs: [1, 2] },
				{ error: 'gave up', inputs: [3] },
			]),
		});

		const request = expanded.nodes.find((n) => n.name === 'Repeat › request 1');
		expect(request).toMatchObject({
			id: 'repeat:request 1',
			parameters: { url: 'https://x.test' },
			credentials: repeat.credentials,
		});

		expect([...expanded.scopes.keys()]).toHaveLength(6);
		expect(expanded.scopes.get('Repeat › check 2')).toEqual({ id: 'repeat', name: 'Repeat' });
		expect(expanded.scopes.has('Start')).toBe(false);
	});

	it('wires the outside connections to the entry and keeps the outgoing ones on the exit', () => {
		const expanded = expandComposites(
			workflow(node('Repeat', 'test.repeat', { attempts: 1 })),
			nodeTypes,
		);

		expect(expanded.connections).toEqual({
			Start: main(['Repeat › entry', 0]),
			Repeat: main(['After', 0]),
			'Repeat › entry': main(['Repeat', 0], ['Repeat › request 1', 0]),
			'Repeat › request 1': main(['Repeat › check 1', 0]),
			'Repeat › check 1': {
				main: [
					[{ node: 'Repeat', type: 'main', index: 1 }],
					[{ node: 'Repeat', type: 'main', index: 2 }],
				],
			},
		});
	});

	it('moves expressions of input-context parameters to the entry node', () => {
		const expanded = expandComposites(
			workflow(
				node('Repeat', 'test.repeat', {
					url: '=https://x.test/{{ $json.id }}',
					attempts: 2,
					doneWhen: '={{ $json.status }}',
				}),
			),
			nodeTypes,
		);

		const entry = expanded.nodes.find((n) => n.name === 'Repeat › entry');
		expect(entry?.parameters).toEqual({
			values: { value: [{ name: 'p0', value: '=https://x.test/{{ $json.id }}' }] },
		});

		const reference = '={{ $("Repeat › entry").item.json["p0"] }}';
		for (const name of ['Repeat › request 1', 'Repeat › request 2']) {
			expect(expanded.nodes.find((n) => n.name === name)?.parameters).toEqual({ url: reference });
		}

		// inner-context parameters are evaluated where the inner node runs
		expect(expanded.nodes.find((n) => n.name === 'Repeat › check 1')?.parameters).toEqual({
			when: '={{ $json.status }}',
		});
	});

	it('rejects an expression in a value that decides the shape', () => {
		expect(() =>
			expandComposites(
				workflow(node('Repeat', 'test.repeat', { attempts: '={{ 3 }}' })),
				nodeTypes,
			),
		).toThrow('Node "Repeat" sets "attempts" with an expression');
	});

	it('leaves skipped and disabled composites as they are', () => {
		const repeat = node('Repeat', 'test.repeat');

		expect(
			expandComposites(workflow(repeat), nodeTypes, { skip: new Set(['Repeat']) }).nodes,
		).toContain(repeat);
		const disabled = { ...repeat, disabled: true };
		expect(expandComposites(workflow(disabled), nodeTypes).nodes).toContain(disabled);
	});

	it('rejects an inner node name that another node already has', () => {
		const original = workflow(node('Repeat', 'test.repeat', { attempts: 1 }));
		original.nodes.push(node('Repeat › check 1', 'test.after'));

		expect(() => expandComposites(original, nodeTypes)).toThrow(
			'Node "Repeat" needs the name "Repeat › check 1"',
		);
	});
});

describe('layout of an expansion', () => {
	const positions = (nodes: INode[]) => Object.fromEntries(nodes.map((n) => [n.name, n.position]));

	it('draws inner nodes in layers from the entry and puts the exit after them', () => {
		const repeat = {
			...node('Repeat', 'test.repeat', { attempts: 2 }),
			position: [100, 50] as [number, number],
		};

		const { nodes } = expandComposites({ nodes: [repeat], connections: {} }, nodeTypes);

		expect(positions(nodes)).toEqual({
			'Repeat › entry': [100, 50],
			'Repeat › request 1': [340, 50],
			'Repeat › check 1': [580, 50],
			'Repeat › request 2': [820, 50],
			'Repeat › check 2': [1060, 50],
			Repeat: [1300, 50],
		});
	});

	it('uses the cells the definition gives', () => {
		class Grid extends Repeat {
			override composite: CompositeNodeType['composite'] = {
				expand: (c) => {
					const done = c.exit({ output: 0 });
					for (const row of [0, 1]) {
						const inner = c.addNode(`step ${row}`, {
							type: 'test.request',
							typeVersion: 1,
							parameters: {},
							cell: { column: 1, row },
						});
						c.connect(c.entry, inner);
						c.connect(inner, done);
					}
				},
			};
		}
		const gridTypes: INodeTypes = { ...nodeTypes, getByNameAndVersion: () => new Grid() };

		const { nodes } = expandComposites(
			{ nodes: [node('Grid', 'test.grid')], connections: {} },
			gridTypes,
		);

		expect(positions(nodes)).toEqual({
			'Grid › entry': [0, 0],
			'Grid › step 0': [240, 0],
			'Grid › step 1': [240, 200],
			Grid: [480, 100],
		});
	});
});

describe('expandCompositeNode', () => {
	it('expands a composite on its own, even when it is disabled', () => {
		const repeat = { ...node('Repeat', 'test.repeat', { attempts: 1 }), disabled: true };

		const expanded = expandCompositeNode(repeat, nodeTypes);

		expect(expanded?.nodes.map((n) => n.name)).toEqual([
			'Repeat › entry',
			'Repeat › request 1',
			'Repeat › check 1',
			'Repeat',
		]);
	});

	it('returns nothing for a node that is not a composite', () => {
		expect(expandCompositeNode(node('After', 'test.after'), nodeTypes)).toBeUndefined();
	});
});

describe('exposeProperties', () => {
	it('keeps the properties of the inner version and drops the version conditions', () => {
		const exposed = exposeProperties(
			[
				{ displayName: 'Curl', name: 'curl', type: 'string', default: '' },
				{
					displayName: 'Old',
					name: 'old',
					type: 'string',
					default: '',
					displayOptions: { show: { '@version': [1, 2, 3] } },
				},
				{
					displayName: 'New',
					name: 'new',
					type: 'collection',
					default: {},
					displayOptions: { hide: { '@version': [1, 2, 3] }, show: { mode: ['a'] } },
					options: [
						{
							displayName: 'Nested Old',
							name: 'nestedOld',
							type: 'string',
							default: '',
							displayOptions: { show: { '@version': [{ _cnd: { lt: 4 } }] } },
						},
						{ displayName: 'Nested', name: 'nested', type: 'string', default: '' },
					],
				},
			],
			4.2,
			{ exclude: ['curl'] },
		);

		expect(exposed).toEqual([
			{
				displayName: 'New',
				name: 'new',
				type: 'collection',
				default: {},
				displayOptions: { hide: {}, show: { mode: ['a'] } },
				options: [{ displayName: 'Nested', name: 'nested', type: 'string', default: '' }],
			},
		]);
	});
});
