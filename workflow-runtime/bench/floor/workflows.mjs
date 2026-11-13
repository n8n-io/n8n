// Compiles the workflows of `floor core module` (floor 4, wfrt today) and
// writes their trigger and canned effect responses:
//   sheets-n<N>  N Google Sheets "append row" library nodes (4 calls each)
//   plus the glue, http and slack workloads of bench/mix/workloads.mjs.
//   node bench/floor/workflows.mjs <out-dir>
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = process.argv[2];
const here = dirname(fileURLToPath(import.meta.url));
const langCli = join(here, '..', '..', '..', 'packages', '@n8n', 'workflow-lang', 'src', 'cli.ts');
mkdirSync(outDir, { recursive: true });
execFileSync('node', [join(here, '..', 'mix', 'workloads.mjs'), outDir, '19090'], { stdio: 'ignore' });

const append = (i) =>
	`{ const out = await ctx.node({ name: 'Sheets ${i}', type: 'n8n-nodes-base.googleSheets', typeVersion: 4.7, parameters: { resource: 'sheet', operation: 'append', documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' }, sheetName: { __rl: true, mode: 'id', value: '123' }, columns: { mappingMode: 'defineBelow', value: { Name: trigger.body.id, Count: 7, Tags: 'a' }, schema: [{ id: 'Name' }, { id: 'Count' }, { id: 'Tags' }] } }, credential: 'sheets' }); items = items.map((it) => ({ json: { ...it.json, rows: out.length } })); }`;

for (const n of [4]) {
	const src = `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ id: string; pad: string }>({ path: 'g', method: 'POST' })],
	credentials: { sheets: { type: 'googleSheetsOAuth2Api' } },
	async run(ctx, trigger) {
		let items = [{ json: { id: trigger.body.id, n: 0, amount: 12.5, status: 'closed', email: 'user0@example.com' } }];
		${Array.from({ length: n }, (_, i) => append(i)).join('\n\t\t')}
		return { count: items.length, first: items[0] };
	},
});
`;
	const file = join(outDir, `sheets-n${n}.ts`);
	writeFileSync(file, src);
	execFileSync('node', [langCli, 'compile', file, '-o', join(outDir, `sheets-n${n}`)], { stdio: ['ignore', 'ignore', 'inherit'] });
}

// The webhook trigger of every workload.
writeFileSync(join(outDir, 'trigger.json'), JSON.stringify({ body: { id: 'A-1001', pad: 'x' }, headers: { 'content-type': 'application/json' }, query: {} }));

// The four answers of one append, in call order (as in the library's
// request-equivalence case): sheet list, sheet data, new row, write.
const ok = (body) => ({ status: 200, headers: { 'content-type': 'application/json' }, body });
writeFileSync(
	join(outDir, 'sheets-resp.json'),
	JSON.stringify([
		ok({ sheets: [{ properties: { sheetId: 0, title: 'Sheet1', index: 0 } }, { properties: { sheetId: 123, title: 'Sales Q1', index: 1 } }] }),
		ok({ range: "'Sales Q1'!A1:Z1000", majorDimension: 'ROWS', values: [['Name', 'Count', 'Tags', 'Other'], ['Ada', '3']] }),
		ok({ spreadsheetId: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789', replies: [{}] }),
		ok({ spreadsheetId: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789', updatedRange: "'Sales Q1'!A2:D2", updatedRows: 1, updatedColumns: 4, updatedCells: 4 }),
	]),
);
// One answer for the http and slack workloads.
writeFileSync(join(outDir, 'ok-resp.json'), JSON.stringify([ok({ ok: true, ts: '1700000000.000100', channel: 'C1' })]));
console.log(outDir);
