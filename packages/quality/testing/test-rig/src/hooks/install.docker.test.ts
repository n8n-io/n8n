import { spawnSync } from 'node:child_process';

import { observeHookedMethods } from './catalogue';
import { parseHookLine } from './control';
import { loadManifest } from '../cli/manifest';
import { logs } from '../process';
import { RigStack, stopAllStacks } from '../stack';
import { chain, nodes, webhookPath } from '../workflows';

const images = [
	...new Set(
		Object.values(loadManifest()).flatMap((scenario) =>
			[scenario.before, scenario.after].filter((image): image is string => image !== null),
		),
	),
]
	.filter(
		(image) => spawnSync('docker', ['image', 'inspect', image], { stdio: 'ignore' }).status === 0,
	)
	.sort();

afterEach(async () => await stopAllStacks());

describe.each(images.length ? images : [process.env.TEST_IMAGE_N8N ?? 'n8nio/n8n:2.42.2'])(
	'%s',
	(image) => {
		it('has every method the scenarios hook', async () => {
			const hooks = observeHookedMethods(image.split(':')[1]);
			const rig = await RigStack.start({
				name: 'hook-matrix',
				workers: 1,
				runners: 'internal',
				scale: 1,
				hooks,
				image,
			});
			try {
				await rig.api.signIn();
				const path = webhookPath('matrix');
				const workflowId = await rig.api.createWorkflow(
					chain('hook matrix', [
						nodes.webhook(path),
						nodes.code('Code', 'return [{ json: { ok: true } }];'),
					]),
				);
				expect((await rig.api.webhook(path)).status).toBe(200);
				const [executionId] = await rig.db.executionsOf(workflowId);
				expect((await rig.db.waitForExecution(executionId, 60_000)).status).toBe('success');

				const events = (
					await Promise.all(rig.n8nContainers().map(async ({ container }) => await logs(container)))
				)
					.join('\n')
					.split('\n')
					.map(parseHookLine);
				const notInstalled = hooks
					.filter((hook) => !events.some((e) => e?.point === hook.point && e.event === 'installed'))
					.map((hook) => `${hook.file} ${hook.target}.${hook.method}`);
				expect(notInstalled).toEqual([]);
			} finally {
				await rig.stop();
			}
		});
	},
);
