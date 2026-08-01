import type {
	IDataObject,
	INodeParameters,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
	IWebhookDescription,
	NativeParameterResolvers,
} from 'n8n-workflow';
import { createEmptyRunExecutionData, resolveNativeParameterValue, Workflow } from 'n8n-workflow';
import { join } from 'node:path';

import { n8n as declaredNodes } from '../package.json';

// Native resolution of a webhook description is only as good as the
// classification behind it, and the templates it classifies are a closed set:
// node authors write them, they live in this repo. So rather than sampling
// shapes (that is `native-parameter-resolution-parity.test.ts` in n8n-workflow),
// this walks EVERY webhook description of EVERY node here and asserts that
// whatever the classifier claims it can read natively resolves to what the
// expression engine resolves. A node author adding a template shape we would
// misread fails this test rather than a production webhook.

/** Node classes are declared as built paths; tests run from source. */
const sourcePath = (distPath: string) =>
	join(__dirname, '..', distPath.replace(/^dist\//, '').replace(/\.js$/, '.ts'));

type LoadedNode = { file: string; description: INodeTypeDescription };

const isVersioned = (nodeType: unknown): nodeType is IVersionedNodeType =>
	typeof nodeType === 'object' && nodeType !== null && 'nodeVersions' in nodeType;

/** Every concrete description a node exposes — one per version for versioned nodes. */
async function loadDescriptions(distPath: string): Promise<LoadedNode[]> {
	const module: Record<string, unknown> = await import(sourcePath(distPath));

	return Object.values(module)
		.filter(
			(exported): exported is new () => INodeType | IVersionedNodeType =>
				typeof exported === 'function',
		)
		.flatMap((NodeClass) => {
			let instance: INodeType | IVersionedNodeType;
			try {
				instance = new NodeClass();
			} catch {
				return []; // not a node class
			}

			if (isVersioned(instance)) {
				return Object.values(instance.nodeVersions).map((version) => ({
					file: distPath,
					description: version.description,
				}));
			}

			const description = (instance as INodeType).description;
			return description?.properties ? [{ file: distPath, description }] : [];
		});
}

/**
 * Parameter states to compare under. `falsy` earns its place: the `|| fallback`
 * tails in these templates are plain JS truthiness, so an empty string or a 0
 * takes the fallback where a nullish check would not — the one shape a
 * defaults-only fixture never produces.
 */
type Fill = 'defaults' | 'values' | 'falsy';

function buildParameters(properties: INodeProperties[], fill: Fill): INodeParameters {
	const parameters: INodeParameters = {};

	for (const property of properties) {
		// A name can be declared more than once behind different `displayOptions`
		// (e.g. the Webhook node's single- vs multi-method `httpMethod`). First
		// wins, so the fixture is deterministic rather than last-declaration.
		if (property.name in parameters) continue;

		if (property.type === 'collection' && Array.isArray(property.options)) {
			parameters[property.name] = buildParameters(property.options as INodeProperties[], fill);
			continue;
		}

		if (fill === 'defaults') {
			parameters[property.name] = property.default as INodeParameters[string];
			continue;
		}

		// Keyed off the default's runtime type, not `property.type`: an `options`
		// property holds a string, and those carry the `|| fallback` templates
		const byType: Record<string, INodeParameters[string]> =
			fill === 'values'
				? { string: 'a-value', number: 7, boolean: true }
				: { string: '', number: 0, boolean: false };

		parameters[property.name] =
			byType[typeof property.default] ?? (property.default as INodeParameters[string]);
	}

	return parameters;
}

const buildWorkflow = (description: INodeTypeDescription, parameters: INodeParameters) => {
	const nodeType: INodeType = { description };
	const nodeTypes: INodeTypes = {
		getByName: () => nodeType,
		getByNameAndVersion: () => nodeType,
		getKnownTypes: () => ({}) as IDataObject,
	};

	return new Workflow({
		id: 'corpus',
		nodes: [
			{
				id: 'node-1',
				name: 'Node',
				type: description.name,
				typeVersion: Array.isArray(description.version)
					? Math.max(...description.version)
					: description.version,
				position: [0, 0],
				parameters,
			},
		],
		connections: {},
		active: false,
		nodeTypes,
	});
};

const nodeFiles: string[] = declaredNodes.nodes;

const withWebhooks = (
	await Promise.all(
		nodeFiles.map(async (file) => {
			try {
				return await loadDescriptions(file);
			} catch {
				return []; // node fails to import standalone; other suites cover that
			}
		}),
	)
)
	.flat()
	.filter(({ description }) => description.webhooks?.length);

/** Counts what was actually compared, so the suite cannot pass vacuously. */
let comparisons = 0;

describe('webhook description parity across all nodes', () => {
	it('found the corpus', () => {
		expect(withWebhooks.length).toBeGreaterThan(50);
	});

	describe.each(['defaults', 'values', 'falsy'] as const)('with %s parameters', (fill) => {
		test.each(withWebhooks)('$description.name ($file)', ({ description }) => {
			const workflow = buildWorkflow(description, buildParameters(description.properties, fill));
			const node = workflow.getNode('Node')!;

			for (const webhook of description.webhooks as IWebhookDescription[]) {
				const resolvers = webhook.resolve as NativeParameterResolvers | undefined;

				for (const [field, value] of Object.entries(webhook)) {
					if (field === 'resolve') continue;

					const native = resolveNativeParameterValue(node, value, resolvers?.[field]);
					if (!native.resolved) continue; // engine's job, nothing to compare

					const viaEngine = workflow.expression.resolveSimpleParameterValue(
						value as string,
						{},
						createEmptyRunExecutionData(),
						0,
						0,
						node.name,
						[],
						'internal',
						{},
					);

					comparisons++;
					expect({ field, value: native.value }).toEqual({ field, value: viaEngine });
				}
			}
		});
	});

	it('compared a meaningful number of fields', () => {
		expect(comparisons).toBeGreaterThan(50);
	});
});
