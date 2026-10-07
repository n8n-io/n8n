/**
 * Start the scripted LLM server for a local demo.
 *
 * Usage: tsx services/scripted-llm/cli.ts <script.json> [--port 4010]
 */
import { UserError } from 'n8n-workflow';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { startScriptedLlm } from './scripted-llm.server';
import { parseScript } from './scripted-llm.types';

const USAGE = 'Usage: tsx services/scripted-llm/cli.ts <script.json> [--port 4010]';

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function readOptions(argv: string[]): { scriptPath: string; port: number } {
	const { values, positionals } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: { port: { type: 'string', short: 'p' } },
	});
	const [scriptPath] = positionals;
	if (!scriptPath || positionals.length > 1) throw new UserError(USAGE);

	const port = Number(values.port ?? '0');
	if (!Number.isInteger(port) || port < 0 || port > 65535) {
		throw new UserError(`Invalid port "${values.port}". ${USAGE}`);
	}
	return { scriptPath: resolve(scriptPath), port };
}

async function main(): Promise<void> {
	const { scriptPath, port } = readOptions(process.argv.slice(2));
	const script = parseScript(JSON.parse(await readFile(scriptPath, 'utf8')));
	const llm = await startScriptedLlm({ script, port, log: (line) => console.log(line) });

	console.log(`Scripted LLM listens on ${llm.url}`);
	console.log('Start n8n with these variables:');
	console.log('  N8N_INSTANCE_AI_MODEL=anthropic/claude-scripted');
	console.log(`  N8N_INSTANCE_AI_MODEL_URL=${llm.modelUrl}`);
	console.log('  N8N_INSTANCE_AI_MODEL_API_KEY=scripted');

	const shutdown = () => {
		void llm.stop().then(
			() => process.exit(0),
			(error: unknown) => {
				console.error(`Scripted LLM did not stop: ${errorMessage(error)}`);
				process.exit(1);
			},
		);
	};
	process.once('SIGINT', shutdown);
	process.once('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
	console.error(errorMessage(error));
	process.exit(1);
});
