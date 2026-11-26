import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.use({
	capability: {
		env: { N8N_ENABLED_MODULES: 'agents', TEST_ISOLATION: 'skill-diagrams' },
	},
});

test.describe('Skill diagrams', { annotation: [{ type: 'owner', description: 'Context' }] }, () => {
	test('renders valid Mermaid and shows invalid Mermaid as code', async ({ n8n, api }) => {
		const instructions = '```mermaid\nflowchart LR\naccTitle: Review flow\nA --> B\n```';
		const invalidDiagram = 'flowchart LR\nA --> [';
		const referencePath = 'references/reference.md';
		const reference = [
			'```mermaid\nsequenceDiagram\naccTitle: Review sequence\nAlice->>Bob: Review\n```',
			['```mermaid', invalidDiagram, '```'].join('\n'),
		].join('\n\n');
		const skill = await api.skills.create({
			scope: 'instance',
			skill: {
				name: `diagram-${nanoid(6).toLowerCase()}`,
				description: 'Review a process.',
				instructions,
				references: [{ path: referencePath, content: reference }],
			},
		});
		await api.skills.save(skill.id, {
			baseSkillHash: skill.skillHash,
			description: 'Review a change.',
		});

		await n8n.start.fromHome();
		const skills = n8n.settingsSkills;
		await skills.goto(skill.id);
		await skills.openVersion(1);
		const flow = skills.getSkillDiagram('Review flow');
		await expect(flow).toBeVisible();
		await expect(flow).not.toHaveJSProperty('naturalWidth', 0);

		await skills.selectSkillFile(referencePath);
		const sequence = skills.getSkillDiagram('Review sequence');
		await expect(sequence).toBeVisible();
		await expect(sequence).not.toHaveJSProperty('naturalWidth', 0);
		// The source is visible while Mermaid renders. Wait for the render to finish first.
		await expect(skills.getPendingDiagramFrames()).toHaveCount(0);
		await expect(skills.getSkillCodeBlock(invalidDiagram)).toBeVisible();
	});
});
