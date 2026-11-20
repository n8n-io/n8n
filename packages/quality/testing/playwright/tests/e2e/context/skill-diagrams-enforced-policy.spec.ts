import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

// `default` makes n8n enforce its own nonce policy. Without it, the policy only reports,
// and the browser does not block the scripts of the diagram sandbox.
test.use({
	capability: {
		env: {
			N8N_ENABLED_MODULES: 'agents',
			N8N_CONTENT_SECURITY_POLICY: 'default',
			TEST_ISOLATION: 'skill-diagrams-enforced-policy',
		},
	},
});

test.describe(
	'Skill diagrams with an enforced content security policy',
	{ annotation: [{ type: 'owner', description: 'Context' }] },
	() => {
		test('renders valid Mermaid and shows invalid Mermaid as code', async ({ n8n, api }) => {
			const invalidDiagram = 'flowchart LR\nA --> [';
			const skill = await api.skills.create({
				scope: 'instance',
				skill: {
					name: `diagram-policy-${nanoid(6).toLowerCase()}`,
					description: 'Review a process.',
					instructions: [
						'```mermaid\nflowchart LR\naccTitle: Review flow\nA --> B\n```',
						['```mermaid', invalidDiagram, '```'].join('\n'),
					].join('\n\n'),
				},
			});
			// Only an older version opens read-only for the owner, so save a second version.
			await api.skills.save(skill.id, {
				baseSkillHash: skill.skillHash,
				description: 'Review a change.',
			});

			// Make sure that the instance enforces the policy, so this test cannot pass without it.
			expect(await api.securitySettings.getEnforcedContentSecurityPolicy()).toContain(
				"'strict-dynamic'",
			);

			await n8n.start.fromHome();

			const skills = n8n.settingsSkills;
			await skills.goto(skill.id);
			await skills.openVersion(1);
			const flow = skills.getSkillDiagram('Review flow');
			await expect(flow).toBeVisible();
			await expect(flow).not.toHaveJSProperty('naturalWidth', 0);
			// The source is visible while Mermaid renders. Wait for the render to finish first.
			await expect(skills.getPendingDiagramFrames()).toHaveCount(0);
			await expect(skills.getSkillCodeBlock(invalidDiagram)).toBeVisible();
		});
	},
);
