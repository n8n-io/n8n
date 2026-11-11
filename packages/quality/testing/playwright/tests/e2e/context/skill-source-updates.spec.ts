import type {
	SkillListItem,
	SkillSourceListItem,
	SkillSourceDiscovery,
	SkillSourceUpdates,
} from '@n8n/api-types';

import { test, expect } from '../../../fixtures/base';

// Database writes and source reads have integration coverage. Stub the source API here so
// this browser journey does not depend on a mutable public repository.
test.use({
	capability: { env: { N8N_ENABLED_MODULES: 'agents', TEST_ISOLATION: 'skill-source-updates' } },
});

test.beforeEach(async ({ setupRequirements }) => {
	await setupRequirements({
		storage: { N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ '136_skill_sync': true }) },
	});
});

test.describe(
	'Skill source updates',
	{ annotation: [{ type: 'owner', description: 'Context' }] },
	() => {
		test('connects a source, checks it, and accepts the reviewed update', async ({
			n8n,
		}, testInfo) => {
			const sourceId = '9d34cbe0-58ef-4459-8bab-5f6fd0c953ad';
			const contentHash = 'a'.repeat(64);
			const url = 'https://github.com/acme/skills';
			const source: SkillSourceListItem = {
				id: sourceId,
				type: 'github',
				label: 'acme/skills',
				ref: 'main',
				path: '',
				webUrl: url,
				projectId: null,
				projectName: null,
				projectType: null,
				projectIcon: null,
				skillCount: 1,
				updatesAvailable: 0,
				updatesBlocked: 0,
				health: 'connected',
				lastCheckedAt: null,
				canReview: true,
			};
			const skill: SkillListItem = {
				id: 'skill-docx',
				name: 'docx',
				description: 'Format documents',
				scope: 'instance',
				projectId: null,
				projectName: null,
				projectType: null,
				source: 'github',
				createdBy: null,
				latestVersion: 1,
				availableToAssistant: false,
				availableToMCP: false,
				usedByAgents: 0,
				canEdit: true,
				canDelete: true,
				canStopSyncing: true,
				syncState: 'up_to_date',
				sourceId,
				createdAt: '2026-11-11T10:00:00Z',
				updatedAt: '2026-11-11T10:00:00Z',
			};
			const discovery: SkillSourceDiscovery = {
				source: { type: 'github', label: source.label, ref: 'main', path: '', webUrl: url },
				duplicate: { kind: 'none' },
				truncated: false,
				skills: [
					{
						key: 'docx',
						name: skill.name,
						description: skill.description,
						location: 'docx',
						webUrl: `${url}/tree/main/docx`,
						check: { verdict: 'pass', findings: [] },
						nameTaken: false,
						error: null,
						skippedFiles: [],
						previewFiles: [{ path: 'SKILL.md', text: 'Use plain text.' }],
						previewTruncated: false,
					},
				],
			};
			const updates: SkillSourceUpdates = {
				commit: null,
				updates: [
					{
						skillId: skill.id,
						name: skill.name,
						location: 'docx',
						webUrl: `${url}/tree/abc/docx`,
						contentHash,
						baseVersionId: 'version-1',
						revision: 'abc',
						revisionUrl: `${url}/commit/abc`,
						check: { verdict: 'pass', findings: [] },
						nameClash: null,
						changes: { added: 1, removed: 1 },
						nextVersion: 2,
					},
				],
			};
			let connected = false;
			let accepted: unknown;
			await n8n.page.route('**/rest/skill-sources**', async (route) => {
				const path = new URL(route.request().url()).pathname.replace('/rest/skill-sources', '');
				let data: unknown;
				if (path === '/credentials') data = [];
				else if (path === '/discover') data = discovery;
				else if (path === '' && route.request().method() === 'POST') {
					connected = true;
					data = {
						sourceId,
						imported: [{ key: 'docx', skillId: skill.id, name: skill.name }],
						failed: [],
					};
				} else if (path === '') data = connected ? [source] : [];
				else if (path === `/${sourceId}/check`) {
					source.updatesAvailable = 1;
					skill.syncState = 'update_available';
					data = { label: source.label, updatesFound: 1, throttled: false, lastCheckedAt: null };
				} else if (path === `/${sourceId}/updates`) data = updates;
				else if (path === `/${sourceId}/updates/${skill.id}`)
					data = {
						files: [
							{ path: 'SKILL.md', before: 'Use plain text.', after: 'Use Markdown headings.' },
						],
						agents: [],
						hiddenAgentCount: 0,
					};
				else if (path === `/${sourceId}/commit`)
					data = {
						revision: 'abc',
						webUrl: `${url}/commit/abc`,
						message: 'Update document instructions',
						author: 'Alex',
						date: '2026-11-11T10:00:00Z',
					};
				else if (path === `/${sourceId}/updates/accept`) {
					accepted = route.request().postDataJSON();
					source.updatesAvailable = 0;
					skill.syncState = 'up_to_date';
					skill.latestVersion = 2;
					data = { updatedCount: 1, agents: [], hiddenAgentCount: 0 };
				} else throw new Error(`Unexpected source request: ${path}`);
				await route.fulfill({ json: { data } });
			});
			await n8n.page.route('**/rest/skills**', async (route) => {
				const path = new URL(route.request().url()).pathname;
				const data =
					path === '/rest/skills'
						? {
								data: connected ? [skill] : [],
								count: connected ? 1 : 0,
								page: 0,
								pageCount: 1,
								collapsedSources: [],
							}
						: [];
				await route.fulfill({ json: { data } });
			});
			await n8n.start.fromHome();
			const skills = n8n.settingsSkills;
			await skills.goto();
			await skills.connect(url);
			await n8n.notifications.waitForNotificationAndClose('Added 1 skill');
			await skills.checkForUpdates();
			await n8n.notifications.waitForNotificationAndClose('Checked acme/skills');
			await expect(skills.getUpdateBadge()).toHaveText('1 update');
			await skills.getUpdateBadge().click();
			await expect(skills.getDiff()).toContainText('Use plain text.');
			await expect(skills.getDiff()).toContainText('Use Markdown headings.');
			await testInfo.attach('source-update-review', {
				body: await n8n.page.screenshot({ animations: 'disabled' }),
				contentType: 'image/png',
			});
			await skills.getAcceptButton().click();
			await expect(skills.getUpdateDialog()).toBeHidden();
			await expect(skills.getUpdateBadge()).toBeHidden();
			await expect(n8n.notifications.getNotificationByTitle('Updated 1 skill')).toContainText(
				'No agents follow these skills yet.',
			);
			expect(accepted).toEqual({
				updates: [{ skillId: skill.id, contentHash, baseVersionId: 'version-1' }],
				reviewedWarnings: false,
			});
		});
	},
);
