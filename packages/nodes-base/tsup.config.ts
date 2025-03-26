// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';

const commonIgnoredFiles = ['!**/*.d.ts', '!**/*.test.ts'];

// Files used in @n8n/nodes-langchain package
const aiNodesPackageDependencies = [
	'nodes/Code/Sandbox.ts',
	'nodes/Code/PythonSandbox.ts',
	'nodes/Code/JavaScriptSandbox.ts',
	'nodes/Code/utils.ts',
	'nodes/HttpRequest/GenericFunctions.ts',
	'nodes/Postgres/transport/index.ts',
	'nodes/Postgres/v2/methods/credentialTest.ts',
	'nodes/Postgres/v2/helpers/interfaces.ts',
	'nodes/Set/v2/manual.mode.ts',
	'nodes/Set/v2/helpers/interfaces.ts',
	'utils/workflowInputsResourceMapping/GenericFunctions.ts',
	'utils/utilities.ts',
];

// eslint-disable-next-line import/no-default-export
export default defineConfig([
	{
		entry: [
			'{credentials,nodes,test,types,utils}/**/*.ts',
			...commonIgnoredFiles,
			...aiNodesPackageDependencies.map((path) => `!${path}`),
		],
		format: ['cjs'],
		dts: false,
		bundle: false,
	},
	{
		entry: [...aiNodesPackageDependencies, ...commonIgnoredFiles],
		format: ['cjs'],
		dts: true,
		bundle: false,
	},
]);
