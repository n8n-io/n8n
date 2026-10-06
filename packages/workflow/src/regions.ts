import { z } from 'zod';

import type { IConnections, ISourceData, IWorkflowGroup, IWorkflowSettings } from './interfaces';
import { NodeConnectionTypes } from './interfaces';

const regionExitSchema = z.object({
	/** The ID of a member node. */
	node: z.string().min(1),
	output: z.number().int().min(0),
});

const regionBase = {
	/** The ID of the member node that takes the region input. */
	entry: z.string().min(1),
	/** The member outputs whose items leave the region. */
	exits: z.array(regionExitSchema),
};

const passLimit = z.number().int().min(1);

/** At the pass limit: `fail` fails the run, `continue` emits the items as if `until` held. */
const regionOnLimitSchema = z.enum(['fail', 'continue']);

/** `last` emits the items of all passes once, after the last pass. `each` emits after each pass. */
const regionEmitSchema = z.enum(['last', 'each']);

/**
 * The `repeat` of a node group. `forEach` runs the group again for each batch of the items that
 * arrive at `entry`. The other kinds run the group again on the items of the last pass until
 * their exit condition holds. `until` and `next` are n8n expressions for each exit item.
 */
export const workflowGroupRepeatSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('forEach'), ...regionBase, batchSize: z.number().int().min(1) }),
	z.object({
		kind: z.literal('loop'),
		...regionBase,
		maxIterations: passLimit,
		/** True when an exit item leaves the loop. */
		until: z.string(),
		/** The item of the next pass, from an exit item. Without it, the exit item is the next item. */
		next: z.string().optional(),
		onLimit: regionOnLimitSchema.optional(),
		emit: regionEmitSchema.optional(),
	}),
	z.object({
		kind: z.literal('paginate'),
		...regionBase,
		maxPages: passLimit,
		/** The item of the next page, from an exit item, or null after the last page. */
		next: z.string(),
		onLimit: regionOnLimitSchema.optional(),
		emit: regionEmitSchema.optional(),
	}),
	/**
	 * The entry, e.g. a Wait node, runs before each attempt but the first. The first attempt
	 * starts at the members that the entry connects to.
	 */
	z.object({
		kind: z.literal('pollUntil'),
		...regionBase,
		maxAttempts: passLimit,
		/** True when an exit item is the result. */
		until: z.string(),
		onLimit: regionOnLimitSchema.optional(),
	}),
]);

export type WorkflowGroupRepeat = z.infer<typeof workflowGroupRepeatSchema>;

/** The most passes of a region, or `undefined` for `forEach`, which ends with its input. */
export function passLimitOf(repeat: WorkflowGroupRepeat): number | undefined {
	switch (repeat.kind) {
		case 'forEach':
			return undefined;
		case 'loop':
			return repeat.maxIterations;
		case 'paginate':
			return repeat.maxPages;
		case 'pollUntil':
			return repeat.maxAttempts;
	}
}

/** A member output whose items leave a region, by node name. */
export interface RegionExit {
	readonly node: string;
	readonly output: number;
}

/** A node group with `repeat`, resolved to node names. Its name is a run name in the run data. */
export interface Region {
	readonly id: string;
	readonly name: string;
	readonly repeat: WorkflowGroupRepeat;
	readonly entry: string;
	readonly exits: readonly RegionExit[];
	readonly members: ReadonlySet<string>;
	/** The name of the smallest region that holds this one. */
	readonly parent?: string;
	/** The number of regions around this one. */
	readonly depth: number;
}

/** Items of one member output that leave a region when it emits. */
export interface RegionKept {
	readonly source: ISourceData;
	/** The item indexes in the output. */
	readonly items: number[];
}

/** The engine state of a region that runs. It is saved with the execution, so a resume keeps it. */
export interface RegionInstance {
	/** The run output that the region takes: `forEach` batch by batch, the other kinds at once. */
	input: ISourceData;
	/** The first input item of the next batch. */
	cursor: number;
	/** The passes that this instance started. */
	passes: number;
	/** The member outputs that left the region in the pass that runs. */
	exits: ISourceData[];
	/** The items of the passes that ended, for the emit after the last pass. */
	kept: RegionKept[];
	/** The inputs that arrived while the region ran. */
	queued: ISourceData[];
}

export interface RegionProblem {
	readonly groupId: string;
	readonly groupName: string;
	readonly message: string;
}

export interface RegionTreeInput {
	readonly nodes: ReadonlyArray<{ readonly id: string; readonly name: string }>;
	readonly connections: IConnections;
	readonly nodeGroups?: readonly IWorkflowGroup[];
	/** Regions need execution order v1. Without it, the order is not checked. */
	readonly executionOrder?: IWorkflowSettings['executionOrder'];
}

interface MainEdge {
	readonly from: string;
	readonly output: number;
	readonly to: string;
	readonly input: number;
}

const mainEdgesOf = (connections: IConnections): MainEdge[] =>
	Object.entries(connections).flatMap(([from, byType]) =>
		(byType[NodeConnectionTypes.Main] ?? []).flatMap((targets, output) =>
			(targets ?? []).map((target) => ({ from, output, to: target.node, input: target.index })),
		),
	);

const isSubset = (inner: ReadonlySet<string>, outer: ReadonlySet<string>) =>
	[...inner].every((name) => outer.has(name));

function hasCycle(members: ReadonlySet<string>, edges: readonly MainEdge[]): boolean {
	const next = (name: string) =>
		edges.filter((edge) => edge.from === name && members.has(edge.to)).map((edge) => edge.to);
	const done = new Set<string>();
	const reachesItself = (name: string, path: ReadonlySet<string>): boolean => {
		if (path.has(name)) return true;
		if (done.has(name)) return false;
		const found = next(name).some((child) => reachesItself(child, new Set([...path, name])));
		done.add(name);
		return found;
	};
	return [...members].some((name) => reachesItself(name, new Set()));
}

/** The problems of one repeating group, checked against the main edges of the workflow. */
function regionProblems(
	group: IWorkflowGroup,
	repeat: WorkflowGroupRepeat,
	nameOf: ReadonlyMap<string, string>,
	edges: readonly MainEdge[],
): string[] {
	const label = `Region "${group.name}"`;
	const unknown = [...group.nodeIds, repeat.entry, ...repeat.exits.map(({ node }) => node)].filter(
		(id) => !nameOf.has(id),
	);
	if (unknown.length > 0)
		return [`${label} names node IDs that do not exist: ${unknown.join(', ')}`];
	const members = new Set(group.nodeIds.flatMap((id) => nameOf.get(id) ?? []));
	const entry = nameOf.get(repeat.entry) ?? '';
	const exits = repeat.exits.map(({ node, output }) => ({ node: nameOf.get(node) ?? '', output }));
	const isExit = (node: string, output: number) =>
		exits.some((exit) => exit.node === node && exit.output === output);
	const targetsOf = (node: string, output: number) =>
		edges
			.filter((edge) => edge.from === node && edge.output === output && !members.has(edge.to))
			.map((edge) => `${edge.to}\u0000${edge.input}`)
			.sort()
			.join('\u0001');
	const [firstTargets, ...otherTargets] = exits.map(({ node, output }) => targetsOf(node, output));

	return [
		...(group.nodeIds.includes(repeat.entry) ? [] : [`${label}: its entry is not a member`]),
		...exits
			.filter(({ node }) => !members.has(node))
			.map(({ node }) => `${label}: its exit "${node}" is not a member`),
		...edges
			.filter((edge) => !members.has(edge.from) && members.has(edge.to))
			.filter((edge) => edge.to !== entry || edge.input !== 0)
			.map(
				(edge) =>
					`${label}: "${edge.from}" connects to input ${edge.input} of "${edge.to}". Items can go into a region only on input 0 of its entry "${entry}"`,
			),
		...edges
			.filter((edge) => members.has(edge.from) && !members.has(edge.to))
			.filter((edge) => !isExit(edge.from, edge.output))
			.map(
				(edge) =>
					`${label}: output ${edge.output} of "${edge.from}" leaves the region, but it is not an exit`,
			),
		// The region emits all its items once, so each exit must continue to the same nodes.
		...(otherTargets.some((targets) => targets !== firstTargets)
			? [`${label}: its exits connect to different nodes. All exits must connect to the same nodes`]
			: []),
		...(hasCycle(members, edges)
			? [`${label}: its nodes connect in a loop. The region repeats its nodes, so remove the loop`]
			: []),
		...(repeat.kind !== 'forEach' && exits.length === 0
			? [`${label}: it needs an exit, because its exit condition reads the exit items`]
			: []),
		...(repeat.kind === 'pollUntil' ? pollEntryProblems(label, entry, members, edges) : []),
	];
}

/** The entry of `pollUntil` runs between attempts, so the first attempt starts after it. */
function pollEntryProblems(
	label: string,
	entry: string,
	members: ReadonlySet<string>,
	edges: readonly MainEdge[],
): string[] {
	const out = edges.filter((edge) => edge.from === entry);
	return out.length > 0 &&
		out.every((edge) => edge.output === 0 && edge.input === 0 && members.has(edge.to))
		? []
		: [
				`${label}: its entry "${entry}" runs between attempts, so it must connect from output 0 to input 0 of the attempt nodes, and only to them`,
			];
}

/**
 * The regions of a workflow: its node groups with `repeat`, resolved to node names and nested.
 * A workflow with problems must not run, because the engine cannot repeat its regions correctly.
 */
export function regionTreeOf(input: RegionTreeInput): {
	regions: Region[];
	problems: RegionProblem[];
} {
	const groups = (input.nodeGroups ?? []).filter((group) => group.repeat !== undefined);
	if (groups.length === 0) return { regions: [], problems: [] };

	const nameOf = new Map(input.nodes.map((node) => [node.id, node.name]));
	const nodeNames = new Set(nameOf.values());
	const edges = mainEdgesOf(input.connections);
	const checked = groups.map((group) => {
		const parsed = workflowGroupRepeatSchema.safeParse(group.repeat);
		const own = parsed.success
			? regionProblems(group, parsed.data, nameOf, edges)
			: [`Region "${group.name}" has an invalid repeat: ${parsed.error.issues[0]?.message ?? ''}`];
		const named = [
			...(nodeNames.has(group.name)
				? [`Region "${group.name}" has the name of a node. Give the region another name`]
				: []),
			...(groups.filter((other) => other.name === group.name).length > 1
				? [`Two regions have the name "${group.name}"`]
				: []),
			...(input.executionOrder === undefined || input.executionOrder === 'v1'
				? []
				: [`Region "${group.name}" needs execution order v1. Change it in the workflow settings`]),
		];
		return { group, repeat: parsed.data, problems: [...own, ...named] };
	});
	const valid = checked.flatMap(({ group, repeat, problems }) =>
		repeat && problems.length === 0
			? [{ group, repeat, members: new Set(group.nodeIds.flatMap((id) => nameOf.get(id) ?? [])) }]
			: [],
	);
	const overlaps = valid.flatMap((one, index) =>
		valid
			.slice(index + 1)
			.filter(({ members }) => [...members].some((name) => one.members.has(name)))
			.flatMap((other) => {
				const inside = isSubset(one.members, other.members);
				const around = isSubset(other.members, one.members);
				if (inside && around) {
					return [
						`Regions "${one.group.name}" and "${other.group.name}" hold the same nodes. Add a node to the outer region, or remove one region`,
					];
				}
				return inside || around
					? []
					: [
							`Regions "${one.group.name}" and "${other.group.name}" overlap. Two regions must be one inside the other, or apart`,
						];
			})
			.map((message) => ({ group: one.group, message })),
	);
	const problems: RegionProblem[] = [
		...checked.flatMap(({ group, problems: own }) =>
			own.map((message) => ({ groupId: group.id, groupName: group.name, message })),
		),
		...overlaps.map(({ group, message }) => ({
			groupId: group.id,
			groupName: group.name,
			message,
		})),
	];
	if (problems.length > 0) return { regions: [], problems };

	const around = (members: ReadonlySet<string>) =>
		valid
			.filter((other) => other.members !== members && isSubset(members, other.members))
			.sort((a, b) => a.members.size - b.members.size);
	const regions = valid.map(({ group, repeat, members }): Region => {
		const outer = around(members);
		return {
			id: group.id,
			name: group.name,
			repeat,
			entry: nameOf.get(repeat.entry) ?? '',
			exits: repeat.exits.map(({ node, output }) => ({ node: nameOf.get(node) ?? '', output })),
			members,
			parent: outer[0]?.group.name,
			depth: outer.length,
		};
	});
	return { regions, problems: [] };
}

/** The regions that hold `node`, innermost first. */
export const regionsAround = (regions: readonly Region[], node: string): Region[] =>
	regions.filter(({ members }) => members.has(node)).sort((a, b) => b.depth - a.depth);

/** How a main edge crosses region borders. An edge with neither is inside the same regions. */
export interface RegionEdge {
	/** The regions the edge leaves, innermost first. */
	readonly exits: readonly Region[];
	/** The regions the edge goes into, outermost first. */
	readonly enters: readonly Region[];
}

export function classifyRegionEdge(
	regions: readonly Region[],
	from: string,
	to: string,
): RegionEdge {
	return {
		exits: regionsAround(regions, from).filter(({ members }) => !members.has(to)),
		enters: regionsAround(regions, to)
			.filter(({ members }) => !members.has(from))
			.reverse(),
	};
}
