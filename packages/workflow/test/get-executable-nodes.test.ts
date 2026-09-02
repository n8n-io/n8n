import { getExecutableNodeNames } from '../src/common/get-executable-nodes';
import { mapConnectionsByDestination } from '../src/common/map-connections-by-destination';
import type { IConnections } from '../src/interfaces';
import { NodeConnectionTypes } from '../src/interfaces';

const main = (...nodes: string[]) => ({
	[NodeConnectionTypes.Main]: [
		nodes.map((node) => ({ node, type: NodeConnectionTypes.Main, index: 0 })),
	],
});
const aiTool = (node: string) => ({
	[NodeConnectionTypes.AiTool]: [[{ node, type: NodeConnectionTypes.AiTool, index: 0 }]],
});
const aiModel = (node: string) => ({
	[NodeConnectionTypes.AiLanguageModel]: [
		[{ node, type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
	],
});

const run = (connections: IConnections, start: string) =>
	getExecutableNodeNames(connections, mapConnectionsByDestination(connections), start);

describe('getExecutableNodeNames', () => {
	it('always includes the start node itself', () => {
		expect(run({}, 'Trigger')).toEqual(new Set(['Trigger']));
	});

	it('includes the full forward main closure', () => {
		// Trigger → A → B
		const connections: IConnections = { Trigger: main('A'), A: main('B') };

		expect(run(connections, 'Trigger')).toEqual(new Set(['Trigger', 'A', 'B']));
	});

	it('includes AI sub-nodes attached to a reachable node', () => {
		// Trigger → Agent, and Tool/Model attach to Agent via ai_* (sub-node is the source).
		const connections: IConnections = {
			Trigger: main('Agent'),
			Tool: aiTool('Agent'),
			Model: aiModel('Agent'),
		};

		expect(run(connections, 'Trigger')).toEqual(new Set(['Trigger', 'Agent', 'Tool', 'Model']));
	});

	it('includes transitively-nested sub-nodes (a tool with its own model)', () => {
		// Trigger → Agent; Tool → Agent (ai_tool); Model → Tool (ai_languageModel).
		const connections: IConnections = {
			Trigger: main('Agent'),
			Tool: aiTool('Agent'),
			Model: aiModel('Tool'),
		};

		expect(run(connections, 'Trigger')).toEqual(new Set(['Trigger', 'Agent', 'Tool', 'Model']));
	});

	it('excludes a disjoint branch not connected to the start node', () => {
		// Trigger → A is separate from Orphan → OrphanChild.
		const connections: IConnections = {
			Trigger: main('A'),
			Orphan: main('OrphanChild'),
		};

		const result = run(connections, 'Trigger');

		expect(result).toEqual(new Set(['Trigger', 'A']));
		expect(result.has('Orphan')).toBe(false);
		expect(result.has('OrphanChild')).toBe(false);
	});

	it("excludes a second trigger's chain", () => {
		// FormTrigger → Form path; GmailTrigger → Gmail path. Starting at the form
		// trigger must not pull in the Gmail chain.
		const connections: IConnections = {
			FormTrigger: main('SendSlack'),
			GmailTrigger: main('AppendSheet'),
		};

		expect(run(connections, 'FormTrigger')).toEqual(new Set(['FormTrigger', 'SendSlack']));
	});

	it('excludes a sub-node attached to an unreachable node', () => {
		// Tool attaches to B, which the start node can't reach.
		const connections: IConnections = {
			Trigger: main('A'),
			Tool: aiTool('B'),
		};

		const result = run(connections, 'Trigger');

		expect(result).toEqual(new Set(['Trigger', 'A']));
		expect(result.has('Tool')).toBe(false);
	});

	it("does not follow a reachable node's outgoing ai_* edge to an unreachable parent", () => {
		// Trigger → Tool (main). Tool is ALSO wired as a tool of DisjointAgent — Tool is
		// the source of the ai_tool edge, DisjointAgent the destination. DisjointAgent runs
		// on its own branch; a reachable node serving as its tool must not pull it in. (A
		// plain forward 'ALL' walk would cross Tool's outgoing ai_tool edge and add it.)
		const connections: IConnections = {
			Trigger: main('Tool'),
			Tool: aiTool('DisjointAgent'),
		};

		const result = run(connections, 'Trigger');

		expect(result).toEqual(new Set(['Trigger', 'Tool']));
		expect(result.has('DisjointAgent')).toBe(false);
	});

	it('is safe on cycles', () => {
		// A → B → A
		const connections: IConnections = { A: main('B'), B: main('A') };

		expect(run(connections, 'A')).toEqual(new Set(['A', 'B']));
	});

	it('does not mutate the input connections', () => {
		const connections: IConnections = { Trigger: main('Agent'), Tool: aiTool('Agent') };
		const before = JSON.stringify(connections);

		run(connections, 'Trigger');

		expect(JSON.stringify(connections)).toBe(before);
	});
});
