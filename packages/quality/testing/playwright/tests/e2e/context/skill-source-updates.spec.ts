import type { SkillListItem, SkillSourceConnectResponse } from '@n8n/api-types';
import type { ProxyServer } from 'n8n-containers/services/proxy';
import { nanoid } from 'nanoid';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { test, expect } from '../../../fixtures/base';

const run = promisify(execFile);

test.use({
	capability: {
		services: ['proxy'],
		env: {
			N8N_ENABLED_MODULES: 'agents',
			N8N_FEATURE_FLAG_OVERRIDES: JSON.stringify({ '136_skill_sync': true }),
			N8N_SKILL_SYNC_MANAGED_BY_ENV: 'true',
			N8N_SKILL_SYNC_ENABLED: 'true',
			TEST_ISOLATION: 'skill-source-updates',
		},
	},
});

test.beforeEach(async ({ setupRequirements }) => {
	await setupRequirements({
		storage: { N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ '136_skill_sync': true }) },
	});
});

/** Serve a fixed GitHub revision. All n8n API requests reach the real backend. */
async function serveRevision(
	proxy: ProxyServer,
	repository: string,
	revision: string,
	instructions: string,
	directory: string,
) {
	for (const name of ['docx', 'xlsx']) {
		const folder = join(directory, 'repository', name);
		await mkdir(folder, { recursive: true });
		await writeFile(
			join(folder, 'SKILL.md'),
			`---\nname: ${name}\ndescription: Format documents\n---\n\n${instructions}\n`,
		);
	}
	const archive = join(directory, 'repository.tar.gz');
	await run('tar', ['-czf', archive, '-C', directory, 'repository']);
	const refs =
		[`${revision} HEAD symref-target:refs/heads/main\n`, `${revision} refs/heads/main\n`]
			.map((line) => `${(Buffer.byteLength(line) + 4).toString(16).padStart(4, '0')}${line}`)
			.join('') + '0000';
	await proxy.clearAllExpectations();
	await proxy.failOnUnmatched([`/acme/${repository}.*`, `/repos/acme/${repository}.*`]);
	await proxy.createExpectation({
		httpRequest: { method: 'POST', path: `/acme/${repository}\\.git/git-upload-pack` },
		httpResponse: { statusCode: 200, body: refs },
	});
	await proxy.createExpectation({
		httpRequest: { method: 'GET', path: `/acme/${repository}/tar\\.gz/${revision}` },
		httpResponse: {
			statusCode: 200,
			body: { type: 'BINARY', base64Bytes: (await readFile(archive)).toString('base64') },
		},
	});
	await proxy.createExpectation({
		httpRequest: { method: 'GET', path: `/repos/acme/${repository}/git/commits/${revision}` },
		httpResponse: {
			statusCode: 200,
			body: JSON.stringify({ message: 'Update document instructions', author: { name: 'Alex' } }),
		},
	});
}

test.describe(
	'Skill source updates',
	{ annotation: [{ type: 'owner', description: 'Context' }] },
	() => {
		test('connects a source, checks it, and accepts only the selected update', async ({
			n8n,
			services,
		}, testInfo) => {
			test.setTimeout(120_000);
			const repository = `skills-${nanoid().toLowerCase()}`;
			await serveRevision(
				services.proxy,
				repository,
				'a'.repeat(40),
				'Use plain text.',
				testInfo.outputPath('before'),
			);
			await n8n.start.fromHome();
			const skills = n8n.settingsSkills;
			await skills.goto();
			const connected = n8n.page.waitForResponse(
				(response) =>
					new URL(response.url()).pathname === '/rest/skill-sources' &&
					response.request().method() === 'POST',
			);
			await skills.connect(`https://github.com/acme/${repository}`);
			await n8n.notifications.waitForNotificationAndClose('Added 2 skills');
			const {
				data: { sourceId, imported },
			} = (await (await connected).json()) as { data: SkillSourceConnectResponse };

			await serveRevision(
				services.proxy,
				repository,
				'b'.repeat(40),
				'Use Markdown headings.',
				testInfo.outputPath('after'),
			);
			// Import starts the one-minute check interval. Retry through the same UI action.
			await expect
				.poll(
					async () => {
						const checked = n8n.page.waitForResponse(
							(response) =>
								new URL(response.url()).pathname === `/rest/skill-sources/${sourceId}/check`,
						);
						await skills.checkForUpdates(sourceId);
						return (await (await checked).json()).data.throttled;
					},
					{ timeout: 70_000, intervals: [5_000] },
				)
				.toBe(false);
			await n8n.notifications.waitForNotificationAndClose(`Checked acme/${repository}`);
			await expect(skills.getUpdateBadge(sourceId)).toHaveText('2 updates');
			await skills.getUpdateBadge(sourceId).click();
			await expect(skills.getDiff()).toContainText('Use plain text.');
			await expect(skills.getDiff()).toContainText('Use Markdown headings.');
			await skills.getUpdateCheckbox('xlsx').uncheck();
			await skills.getAcceptButton().click();
			await expect(skills.getUpdateDialog()).toBeHidden();
			await expect(skills.getUpdateBadge(sourceId)).toHaveText('1 update');
			await expect(n8n.notifications.getNotificationByTitle('Updated 1 skill')).toContainText(
				'No agents follow these skills yet.',
			);

			const reloaded = n8n.page.waitForResponse(
				(response) =>
					new URL(response.url()).pathname === '/rest/skills' &&
					response.request().method() === 'GET',
			);
			await n8n.page.reload();
			await expect(skills.getUpdateBadge(sourceId)).toHaveText('1 update');
			const {
				data: { data: saved },
			} = (await (await reloaded).json()) as { data: { data: SkillListItem[] } };
			for (const { skillId, name } of imported) {
				expect(saved.find(({ id }) => id === skillId)).toMatchObject({
					latestVersion: name === 'docx' ? 2 : 1,
					syncState: name === 'docx' ? 'up_to_date' : 'update_available',
				});
			}
		});
	},
);
