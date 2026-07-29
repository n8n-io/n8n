const fs = require('node:fs');
const path = require('node:path');

const { displayParameter } = require('n8n-workflow');

const packageDirectory = path.resolve(__dirname, '..');
const excludedGroups = new Set(['transform', 'organization', 'schedule', 'trigger']);
const complexityRank = { easy: 0, medium: 1, complex: 2 };

function parseOutputDirectory() {
	const outputArgumentIndex = process.argv.indexOf('--output');
	if (outputArgumentIndex === -1) {
		return path.join(packageDirectory, '.data', 'node-mcp-complexity');
	}

	const outputDirectory = process.argv[outputArgumentIndex + 1];
	if (!outputDirectory) {
		throw new Error('The --output argument requires a directory.');
	}

	return path.resolve(process.cwd(), outputDirectory);
}

function isPropertyOption(option) {
	return option !== null && typeof option === 'object' && 'value' in option;
}

function getDefaultNode(node) {
	if (!('nodeVersions' in node)) return node;

	const defaultNode = node.nodeVersions[node.currentVersion];
	if (!defaultNode) {
		throw new Error(`Default version ${node.currentVersion} is not available.`);
	}

	return defaultNode;
}

function getDefaultParameters(properties) {
	return Object.fromEntries(
		properties
			.filter((property) => property.default !== undefined)
			.map((property) => [property.name, property.default]),
	);
}

function isDisplayed(property, parameters, description, version) {
	return displayParameter(parameters, property, { typeVersion: version }, description);
}

function getStaticOptionValues(property, parameters, description, version) {
	if (!Array.isArray(property.options)) return [];

	return property.options
		.filter(isPropertyOption)
		.filter((option) => isDisplayed(option, parameters, description, version))
		.map((option) => ({
			name: String(option.name),
			value: option.value,
		}));
}

function getOperations(description) {
	const { properties } = description;
	const version = Array.isArray(description.version)
		? description.version[description.version.length - 1]
		: description.version;
	const defaultParameters = getDefaultParameters(properties);
	const resourceProperties = properties.filter(
		(property) => property.name === 'resource' && property.type === 'options',
	);
	const resources = resourceProperties.flatMap((property) =>
		getStaticOptionValues(property, defaultParameters, description, version),
	);
	const uniqueResources = [
		...new Map(resources.map((resource) => [String(resource.value), resource])).values(),
	];
	const resourceSelections =
		uniqueResources.length > 0 ? uniqueResources : [{ name: 'Node', value: undefined }];
	const operations = [];

	for (const resource of resourceSelections) {
		const resourceParameters = {
			...defaultParameters,
			...(resource.value === undefined ? {} : { resource: resource.value }),
		};
		const operationProperties = properties.filter(
			(property) =>
				property.name === 'operation' &&
				property.type === 'options' &&
				isDisplayed(property, resourceParameters, description, version),
		);

		const resourceOperations = operationProperties.flatMap((property) =>
			getStaticOptionValues(property, resourceParameters, description, version),
		);

		if (resourceOperations.length === 0) {
			operations.push({
				resource: resource.value === undefined ? undefined : String(resource.value),
				resourceName: resource.name,
				operation: undefined,
				operationName: 'Default',
				parameters: resourceParameters,
			});
			continue;
		}

		for (const operation of resourceOperations) {
			operations.push({
				resource: resource.value === undefined ? undefined : String(resource.value),
				resourceName: resource.name,
				operation: String(operation.value),
				operationName: operation.name,
				parameters: { ...resourceParameters, operation: operation.value },
			});
		}
	}

	return {
		operations: [
			...new Map(
				operations.map((operation) => [
					`${operation.resource ?? ''}\0${operation.operation ?? ''}`,
					operation,
				]),
			).values(),
		],
		version,
	};
}

function visitProperties(properties, visit, parentPath = '') {
	for (const property of properties) {
		const propertyPath = parentPath ? `${parentPath}.${property.name}` : property.name;
		const visitChildren = visit(property, propertyPath);

		if (visitChildren === false || !Array.isArray(property.options)) continue;

		for (const option of property.options) {
			if (option !== null && typeof option === 'object' && Array.isArray(option.values)) {
				visitProperties(option.values, visit, `${propertyPath}.${option.name}`);
			} else if (
				(property.type === 'collection' || property.type === 'fixedCollection') &&
				option !== null &&
				typeof option === 'object' &&
				'type' in option
			) {
				visitProperties([option], visit, propertyPath);
			}
		}
	}
}

function inspectOperation(description, operation, version) {
	const fields = {
		resourceLocators: [],
		loadOptions: [],
		resourceMappers: [],
		dependent: [],
	};

	visitProperties(description.properties, (property, propertyPath) => {
		if (!isDisplayed(property, operation.parameters, description, version)) return false;

		if (property.type === 'resourceMapper') {
			fields.resourceMappers.push(propertyPath);
			return true;
		}

		if (property.type === 'resourceLocator') {
			fields.resourceLocators.push(propertyPath);
			return true;
		}

		const hasLoadOptions =
			(property.type === 'options' || property.type === 'multiOptions') &&
			(property.typeOptions?.loadOptionsMethod || property.typeOptions?.loadOptions);
		if (!hasLoadOptions) return true;

		fields.loadOptions.push(propertyPath);
		if ((property.typeOptions?.loadOptionsDependsOn?.length ?? 0) > 0) {
			fields.dependent.push(propertyPath);
		}

		return true;
	});

	let complexity = 'easy';
	let reason = 'No dynamic input fields';
	const dynamicFieldCount = fields.resourceLocators.length + fields.loadOptions.length;

	if (fields.resourceMappers.length > 0) {
		complexity = 'complex';
		reason = 'Uses a resource mapper';
	} else if (fields.dependent.length > 0) {
		complexity = 'complex';
		reason = 'Has a dependency chain between dynamic parameters';
	} else if (dynamicFieldCount > 1 && fields.loadOptions.length > 0) {
		complexity = 'complex';
		reason = 'Uses more than one dynamic field';
	} else if (dynamicFieldCount > 0) {
		complexity = 'medium';
		reason =
			fields.resourceLocators.length > 1
				? 'Uses multiple independent resource locators'
				: 'Uses one independent dynamic field';
	}

	return {
		resource: operation.resource,
		resourceName: operation.resourceName,
		operation: operation.operation,
		operationName: operation.operationName,
		complexity,
		reason,
		fields,
	};
}

function classifyNode(nodePath) {
	const absoluteNodePath = path.join(packageDirectory, nodePath);
	const className = path.parse(nodePath).name.split('.')[0];
	const nodeModule = require(absoluteNodePath);
	const NodeClass = nodeModule[className];
	if (typeof NodeClass !== 'function') {
		throw new Error(`Could not find exported class ${className}.`);
	}

	const node = getDefaultNode(new NodeClass());
	const { description } = node;
	if (description.group.some((group) => excludedGroups.has(group))) return undefined;

	const { operations, version } = getOperations(description);
	const classifiedOperations = operations.map((operation) =>
		inspectOperation(description, operation, version),
	);
	const complexity = classifiedOperations.reduce(
		(highest, operation) =>
			complexityRank[operation.complexity] > complexityRank[highest]
				? operation.complexity
				: highest,
		'easy',
	);

	return {
		name: description.name,
		displayName: description.displayName,
		type: `n8n-nodes-base.${description.name}`,
		version,
		groups: description.group,
		complexity,
		operations: classifiedOperations,
		source: nodePath.replaceAll('\\', '/').replace(/^dist\//, ''),
	};
}

function countByComplexity(items) {
	return items.reduce(
		(counts, item) => {
			counts[item.complexity] += 1;
			return counts;
		},
		{ easy: 0, medium: 0, complex: 0 },
	);
}

function escapeHtml(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

function renderChart(title, counts) {
	const total = counts.easy + counts.medium + counts.complex;
	return `
		<section class="panel">
			<h2>${escapeHtml(title)}</h2>
			${['easy', 'medium', 'complex']
				.map((complexity) => {
					const percentage = total === 0 ? 0 : (counts[complexity] / total) * 100;
					return `<div class="bar-row">
						<span class="bar-label">${complexity}</span>
						<div class="bar-track"><div class="bar ${complexity}" style="width:${percentage}%"></div></div>
						<strong>${counts[complexity]} <small>(${percentage.toFixed(1)}%)</small></strong>
					</div>`;
				})
				.join('')}
		</section>`;
}

function renderHtml(report) {
	const nodeRows = report.nodes
		.map((node) => {
			const operationCounts = countByComplexity(node.operations);
			const operationRows = node.operations
				.map(
					(operation) => `<tr>
						<td>${escapeHtml(operation.resourceName)}</td>
						<td>${escapeHtml(operation.operationName)}</td>
						<td><span class="badge ${operation.complexity}">${operation.complexity}</span></td>
						<td>${escapeHtml(operation.reason)}</td>
						<td>${escapeHtml(
							[
								...operation.fields.resourceMappers,
								...operation.fields.resourceLocators,
								...operation.fields.loadOptions,
							].join(', ') || '—',
						)}</td>
					</tr>`,
				)
				.join('');

			return `<details class="node" data-complexity="${node.complexity}">
				<summary>
					<span>${escapeHtml(node.displayName)}</span>
					<code>${escapeHtml(node.type)}</code>
					<span class="badge ${node.complexity}">${node.complexity}</span>
					<span>${node.operations.length} operations · ${operationCounts.easy} easy · ${operationCounts.medium} medium · ${operationCounts.complex} complex</span>
				</summary>
				<table>
					<thead><tr><th>Resource</th><th>Operation</th><th>Complexity</th><th>Reason</th><th>Dynamic fields</th></tr></thead>
					<tbody>${operationRows}</tbody>
				</table>
			</details>`;
		})
		.join('');

	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>nodes-base MCP adaptation complexity</title>
	<style>
		:root { color-scheme: light dark; font-family: Inter, system-ui, sans-serif; }
		body { max-width: 1400px; margin: 0 auto; padding: 32px; background: #101114; color: #f5f6f8; }
		h1 { margin-bottom: 4px; }
		.meta { color: #a9afba; margin: 0 0 24px; }
		.charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px; }
		.panel, .node { background: #191b20; border: 1px solid #2d3038; border-radius: 10px; }
		.panel { padding: 20px; }
		.bar-row { display: grid; grid-template-columns: 70px 1fr 110px; gap: 12px; align-items: center; margin: 14px 0; }
		.bar-label, .badge { text-transform: capitalize; }
		.bar-track { height: 22px; background: #292c33; border-radius: 5px; overflow: hidden; }
		.bar { height: 100%; min-width: 2px; }
		.easy { background: #258750; }
		.medium { background: #b7791f; }
		.complex { background: #c2413b; }
		small { color: #a9afba; }
		.rules { margin: 24px 0; line-height: 1.5; }
		.node { margin: 10px 0; overflow: hidden; }
		summary { cursor: pointer; display: grid; grid-template-columns: minmax(180px, 1fr) minmax(240px, 1fr) 90px minmax(260px, 2fr); gap: 12px; align-items: center; padding: 14px; }
		code { color: #bdc4d0; overflow-wrap: anywhere; }
		.badge { color: white; display: inline-block; border-radius: 999px; padding: 3px 9px; width: fit-content; font-size: 12px; font-weight: 700; }
		table { width: 100%; border-collapse: collapse; font-size: 13px; }
		th, td { border-top: 1px solid #2d3038; padding: 10px 14px; text-align: left; vertical-align: top; }
		th { color: #bdc4d0; }
		@media (max-width: 850px) { summary { grid-template-columns: 1fr; } body { padding: 16px; } }
	</style>
</head>
<body>
	<h1>nodes-base MCP adaptation complexity</h1>
	<p class="meta">${report.summary.nodes.total} nodes and ${report.summary.operations.total} operations analyzed. Excluded groups: ${report.excludedGroups.join(', ')}.</p>
	<div class="charts">
		${renderChart('Node distribution', report.summary.nodes)}
		${renderChart('Operation distribution', report.summary.operations)}
	</div>
	<div class="rules">
		<strong>Rules:</strong> Complex uses a resource mapper, a dynamic dependency chain, or multiple dynamic fields.
		Medium uses independent dynamic fields, including multiple independent resource locators. Easy has no dynamic inputs.
		Node complexity is the highest complexity among its operations.
	</div>
	<h2>Nodes and operations</h2>
	${nodeRows}
</body>
</html>`;
}

function renderMarkdown(report) {
	const lines = [
		'# nodes-base MCP adaptation complexity',
		'',
		`Analyzed ${report.summary.nodes.total} nodes and ${report.summary.operations.total} operations.`,
		`Excluded node groups: ${report.excludedGroups.map((group) => `\`${group}\``).join(', ')}.`,
		'',
		'## Distribution',
		'',
		'| Unit | Easy | Medium | Complex | Total |',
		'| --- | ---: | ---: | ---: | ---: |',
		`| Nodes | ${report.summary.nodes.easy} | ${report.summary.nodes.medium} | ${report.summary.nodes.complex} | ${report.summary.nodes.total} |`,
		`| Operations | ${report.summary.operations.easy} | ${report.summary.operations.medium} | ${report.summary.operations.complex} | ${report.summary.operations.total} |`,
		'',
		'## Nodes',
		'',
		'| Node | Complexity | Easy operations | Medium operations | Complex operations | Total operations |',
		'| --- | --- | ---: | ---: | ---: | ---: |',
	];

	for (const node of report.nodes) {
		const counts = countByComplexity(node.operations);
		lines.push(
			`| ${node.displayName} (\`${node.type}\`) | ${node.complexity} | ${counts.easy} | ${counts.medium} | ${counts.complex} | ${node.operations.length} |`,
		);
	}

	return `${lines.join('\n')}\n`;
}

function main() {
	const outputDirectory = parseOutputDirectory();
	const packageJson = require(path.join(packageDirectory, 'package.json'));
	const nodePaths = packageJson.n8n.nodes;
	if (!fs.existsSync(path.join(packageDirectory, 'dist', 'nodes'))) {
		throw new Error(
			'nodes-base must be built before generating the report. Run `pnpm build` first.',
		);
	}

	const nodes = [];
	const failures = [];
	let excludedNodeCount = 0;

	for (const nodePath of nodePaths) {
		try {
			const node = classifyNode(nodePath);
			if (node) nodes.push(node);
			else excludedNodeCount += 1;
		} catch (error) {
			failures.push({ nodePath, error: error instanceof Error ? error.message : String(error) });
		}
	}

	if (failures.length > 0) {
		const details = failures.map(({ nodePath, error }) => `- ${nodePath}: ${error}`).join('\n');
		throw new Error(`Failed to inspect ${failures.length} node(s):\n${details}`);
	}

	nodes.sort(
		(left, right) =>
			complexityRank[right.complexity] - complexityRank[left.complexity] ||
			left.displayName.localeCompare(right.displayName),
	);
	const operations = nodes.flatMap((node) => node.operations);
	const nodeCounts = countByComplexity(nodes);
	const operationCounts = countByComplexity(operations);
	const report = {
		generatedAt: new Date().toISOString(),
		excludedGroups: [...excludedGroups],
		excludedNodeCount,
		summary: {
			nodes: { ...nodeCounts, total: nodes.length },
			operations: { ...operationCounts, total: operations.length },
		},
		nodes,
	};

	fs.mkdirSync(outputDirectory, { recursive: true });
	fs.writeFileSync(path.join(outputDirectory, 'report.html'), renderHtml(report));
	fs.writeFileSync(path.join(outputDirectory, 'summary.md'), renderMarkdown(report));
	fs.writeFileSync(path.join(outputDirectory, 'data.json'), `${JSON.stringify(report, null, 2)}\n`);

	console.log(`Analyzed ${nodes.length} nodes and ${operations.length} operations.`);
	console.log(`Excluded ${excludedNodeCount} nodes by group.`);
	console.log(
		`Nodes: ${nodeCounts.easy} easy, ${nodeCounts.medium} medium, ${nodeCounts.complex} complex.`,
	);
	console.log(
		`Operations: ${operationCounts.easy} easy, ${operationCounts.medium} medium, ${operationCounts.complex} complex.`,
	);
	console.log(`Report: ${path.join(outputDirectory, 'report.html')}`);
	console.log(`Summary: ${path.join(outputDirectory, 'summary.md')}`);
	console.log(`Data: ${path.join(outputDirectory, 'data.json')}`);
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
}
