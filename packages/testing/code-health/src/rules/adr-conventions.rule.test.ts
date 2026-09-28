import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CodeHealthContext } from '../context.js';
import type { AdrFileAccess } from './adr-conventions-files.js';
import { AdrConventionsRule } from './adr-conventions.rule.js';

function createTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'code-health-adr-test-'));
}

function addTestFile(rootDir: string, relativePath: string, content: string): void {
	testFiles.set(path.join(rootDir, relativePath), content);
}

function writeDiskFile(rootDir: string, relativePath: string, content: string): void {
	const filePath = path.join(rootDir, relativePath);
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, content);
}

const testFiles = new Map<string, string>();

function createFileAccess(rootDir: string): AdrFileAccess {
	return {
		glob: vi.fn(async (patterns) => {
			const filePaths = [...testFiles.keys()];
			if (Array.isArray(patterns) && patterns.includes('**/ADR-*.md')) {
				return filePaths.filter((filePath) => {
					const fileName = path.basename(filePath);
					return fileName.startsWith('ADR-') || fileName === 'ADR_TEMPLATE.md';
				});
			}
			return filePaths.filter(
				(filePath) => filePath === path.join(rootDir, 'packages/engine/package.json'),
			);
		}),
		readFile: vi.fn((filePath: string) => {
			const content = testFiles.get(filePath);
			if (content === undefined) throw new Error(`Missing test file: ${filePath}`);
			return content;
		}),
	};
}

function validAdrTemplate(): string {
	return `# <Decision title>

Date: YYYY-MM-DD

Status: <!-- Active / Superseded / Deprecated -->

Decision Owner: <!-- Owning team -->

Source: <!-- RFC, issue, project, incident, or other source -->

Supersedes: <!-- Omit if not relevant -->

Superseded by: <!-- Omit if not relevant -->

## Context

<!-- Explain the problem and the important constraints. -->

## Decision

<!-- State the decision clearly. -->

## Alternatives Considered

<!-- List the main alternatives. -->

## Consequences

<!-- List the important consequences. -->

## Links

RFC: <!-- RFC from which this originated. '-' if none -->

Documentation: <!-- Links to documents related to this ADR. '-' if none -->

Related ADRs: <!-- Links to related ADRs. '-' if none -->
`;
}

function validAdr(
	options: {
		title?: string;
		date?: string;
		status?: string;
		owner?: string;
		metadata?: string;
		context?: string;
		decision?: string;
		alternatives?: string;
		consequences?: string;
		rfc?: string;
		documentation?: string;
		relatedAdrs?: string;
	} = {},
): string {
	const {
		title = 'Adopt a stable interface',
		date = '2026-09-22',
		status = 'Active',
		owner = 'Catalysts',
		metadata = '',
		context = 'The existing interface changes too often.',
		decision = 'We will use a stable interface.',
		alternatives = 'Keep changing the interface.',
		consequences = 'Consumers can rely on the interface.',
		rfc = '-',
		documentation = '-',
		relatedAdrs = '-',
	} = options;
	const optionalMetadata = metadata ? `\n\n${metadata}` : '';

	return `# ${title}

Date: ${date}

Status: ${status}

Decision Owner: ${owner}${optionalMetadata}

## Context

${context}

## Decision

${decision}

## Alternatives Considered

${alternatives}

## Consequences

${consequences}

## Links

RFC: ${rfc}

Documentation: ${documentation}

Related ADRs: ${relatedAdrs}
`;
}

describe('AdrConventionsRule', () => {
	let tmpDir: string;
	let rule: AdrConventionsRule;

	beforeEach(() => {
		testFiles.clear();
		tmpDir = path.resolve('/repo');
		addTestFile(
			tmpDir,
			'pnpm-workspace.yaml',
			`packages:
  - packages/*
  - packages/modules/**
`,
		);
		addTestFile(tmpDir, 'packages/engine/package.json', '{"name":"engine"}\n');
		rule = new AdrConventionsRule(createFileAccess(tmpDir));
		rule.configure({ options: { allowedOwners: ['Catalysts'] } });
	});

	function context(): CodeHealthContext {
		return { rootDir: tmpDir };
	}

	it.each([
		'docs/adr/ADR-20260922-adopt-a-stable-interface.md',
		'packages/engine/docs/adr/ADR-20260922-adopt-a-stable-interface.md',
	])('accepts a complete ADR at %s', async (relativePath) => {
		const diskRoot = createTempDir();

		try {
			writeDiskFile(
				diskRoot,
				'pnpm-workspace.yaml',
				'packages:\n  - packages/*\n  - packages/modules/**\n',
			);
			writeDiskFile(diskRoot, 'packages/engine/package.json', '{"name":"engine"}\n');
			writeDiskFile(diskRoot, relativePath, validAdr());
			const diskRule = new AdrConventionsRule();
			diskRule.configure({ options: { allowedOwners: ['Catalysts'] } });

			await expect(diskRule.analyze({ rootDir: diskRoot })).resolves.toEqual([]);
		} finally {
			fs.rmSync(diskRoot, { recursive: true, force: true });
		}
	});

	it('accepts the root ADR template', async () => {
		addTestFile(tmpDir, 'docs/ADR_TEMPLATE.md', validAdrTemplate());

		await expect(rule.analyze(context())).resolves.toEqual([]);
	});

	it('checks the root ADR template structure', async () => {
		addTestFile(
			tmpDir,
			'docs/ADR_TEMPLATE.md',
			validAdrTemplate().replace('## Consequences', '## Effects'),
		);

		const violations = await rule.analyze(context());

		expect(violations.some((violation) => violation.message.includes('required H2 sections'))).toBe(
			true,
		);
	});

	it('discovers invalid locations, malformed names, and duplicate IDs on disk', async () => {
		const diskRoot = createTempDir();

		try {
			const duplicateName = 'ADR-20260922-adopt-a-stable-interface.md';
			writeDiskFile(diskRoot, 'pnpm-workspace.yaml', 'packages:\n  - packages/*\n');
			writeDiskFile(diskRoot, 'packages/engine/package.json', '{"name":"engine"}\n');
			writeDiskFile(diskRoot, `docs/adr/${duplicateName}`, validAdr());
			writeDiskFile(diskRoot, `packages/engine/docs/adr/${duplicateName}`, validAdr());
			writeDiskFile(diskRoot, 'docs/decisions/ADR-2026-09-22-A-Stable-Interface.md', validAdr());
			const diskRule = new AdrConventionsRule();
			diskRule.configure({ options: { allowedOwners: ['Catalysts'] } });

			const violations = await diskRule.analyze({ rootDir: diskRoot });

			expect(
				violations.filter((violation) => violation.message.includes('not unique')),
			).toHaveLength(2);
			expect(violations.some((violation) => violation.message.includes('outside an allowed'))).toBe(
				true,
			);
			expect(violations.some((violation) => violation.message.includes('does not match'))).toBe(
				true,
			);
		} finally {
			fs.rmSync(diskRoot, { recursive: true, force: true });
		}
	});

	it('accepts optional metadata in the prescribed order', async () => {
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260922-adopt-a-stable-interface.md',
			validAdr({
				metadata:
					'Source: RFC-123\n\nSupersedes: ADR-20260921-use-an-old-interface\n\nSuperseded by: ADR-20260923-use-a-new-interface',
			}),
		);
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260921-use-an-old-interface.md',
			validAdr({ title: 'Use an old interface', date: '2026-09-21' }),
		);
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260923-use-a-new-interface.md',
			validAdr({ title: 'Use a new interface', date: '2026-09-23' }),
		);

		await expect(rule.analyze(context())).resolves.toEqual([]);
	});

	it('flags ADR files outside root or workspace package ADR directories', async () => {
		addTestFile(tmpDir, 'docs/decisions/ADR-20260922-adopt-a-stable-interface.md', validAdr());

		const violations = await rule.analyze(context());

		expect(violations.some((violation) => violation.message.includes('outside an allowed'))).toBe(
			true,
		);
	});

	it('does not treat a nested package.json outside workspace globs as a workspace package', async () => {
		addTestFile(tmpDir, 'tools/example/package.json', '{"name":"example"}\n');
		addTestFile(
			tmpDir,
			'tools/example/docs/adr/ADR-20260922-adopt-a-stable-interface.md',
			validAdr(),
		);

		const violations = await rule.analyze(context());

		expect(violations.some((violation) => violation.message.includes('outside an allowed'))).toBe(
			true,
		);
	});

	it('flags malformed filenames', async () => {
		addTestFile(tmpDir, 'docs/adr/ADR-2026-09-22-A-Stable-Interface.md', validAdr());

		const violations = await rule.analyze(context());

		expect(violations.some((violation) => violation.message.includes('does not match'))).toBe(true);
	});

	it.each([
		{
			name: 'a date that differs from the filename',
			fileName: 'ADR-20260921-adopt-a-stable-interface.md',
			date: '2026-09-22',
			message: 'Date must match',
		},
		{
			name: 'an invalid calendar date',
			fileName: 'ADR-20260230-adopt-a-stable-interface.md',
			date: '2026-02-30',
			message: 'valid calendar date',
		},
	])('flags $name', async ({ fileName, date, message }) => {
		addTestFile(tmpDir, `docs/adr/${fileName}`, validAdr({ date }));

		const violations = await rule.analyze(context());

		expect(violations.some((violation) => violation.message.includes(message))).toBe(true);
	});

	it('flags a filename slug that does not match the H1', async () => {
		addTestFile(tmpDir, 'docs/adr/ADR-20260922-stable-interface.md', validAdr());

		const violations = await rule.analyze(context());

		expect(violations.some((violation) => violation.message.includes('match the H1'))).toBe(true);
	});

	it('flags duplicate ADR IDs', async () => {
		const fileName = 'ADR-20260922-adopt-a-stable-interface.md';
		addTestFile(tmpDir, `docs/adr/${fileName}`, validAdr());
		addTestFile(tmpDir, `packages/engine/docs/adr/${fileName}`, validAdr());

		const violations = await rule.analyze(context());

		expect(violations.filter((violation) => violation.message.includes('not unique'))).toHaveLength(
			2,
		);
	});

	it.each([
		['Draft', 'Status must be'],
		['', 'Status must be'],
	])('flags invalid status %j', async (status, message) => {
		addTestFile(tmpDir, 'docs/adr/ADR-20260922-adopt-a-stable-interface.md', validAdr({ status }));

		const violations = await rule.analyze(context());

		expect(violations.some((violation) => violation.message.includes(message))).toBe(true);
	});

	it('flags a decision owner that is not allowlisted', async () => {
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260922-adopt-a-stable-interface.md',
			validAdr({ owner: 'Unknown Team' }),
		);

		const violations = await rule.analyze(context());

		expect(violations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					message: expect.stringContaining('Decision Owner'),
					suggestion: expect.stringContaining('packages/testing/code-health/src/index.ts'),
				}),
			]),
		);
	});

	it.each([
		{
			name: 'missing metadata',
			transform: (content: string) => content.replace('Status: Active\n\n', ''),
		},
		{
			name: 'reordered metadata',
			transform: (content: string) =>
				content.replace('Date: 2026-09-22\n\nStatus: Active', 'Status: Active\n\nDate: 2026-09-22'),
		},
		{
			name: 'duplicated metadata',
			transform: (content: string) =>
				content.replace('Status: Active', 'Status: Active\n\nStatus: Active'),
		},
		{
			name: 'out-of-order optional metadata',
			transform: () =>
				validAdr({ metadata: 'Superseded by: ADR-20260923-new-choice\n\nSource: RFC-123' }),
		},
	])('flags $name', async ({ transform }) => {
		addTestFile(tmpDir, 'docs/adr/ADR-20260922-adopt-a-stable-interface.md', transform(validAdr()));

		const violations = await rule.analyze(context());

		expect(violations.some((violation) => violation.message.includes('metadata fields'))).toBe(
			true,
		);
	});

	it('flags an empty optional metadata field', async () => {
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260922-adopt-a-stable-interface.md',
			validAdr({ metadata: 'Source: -' }),
		);

		const violations = await rule.analyze(context());

		expect(violations.some((violation) => violation.message.includes('Source must contain'))).toBe(
			true,
		);
	});

	it('flags placeholder metadata and supersession fields without an ADR ID', async () => {
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260922-adopt-a-stable-interface.md',
			validAdr({ metadata: 'Source: <RFC or issue>\n\nSupersedes: an old decision' }),
		);

		const violations = await rule.analyze(context());

		expect(violations.some((violation) => violation.message.includes('Source must contain'))).toBe(
			true,
		);
		expect(violations.some((violation) => violation.message.includes('full ADR ID'))).toBe(true);
	});

	it.each([
		{
			name: 'metadata fields',
			transform: (content: string) =>
				content.replace('Date: 2026-09-22\n\nStatus', 'Date: 2026-09-22\nStatus'),
		},
		{
			name: 'metadata and unexpected Markdown',
			transform: (content: string) =>
				content.replace('\n\nDate: 2026-09-22', '\n### Unexpected heading\nDate: 2026-09-22'),
		},
		{
			name: 'a heading and its body',
			transform: (content: string) => content.replace('## Decision\n\nWe', '## Decision\n\n\nWe'),
		},
		{
			name: 'a body and the next heading',
			transform: (content: string) =>
				content.replace(
					'We will use a stable interface.\n\n## Alternatives',
					'We will use a stable interface.\n\n\n## Alternatives',
				),
		},
	])('flags incorrect blank-line spacing between $name', async ({ transform }) => {
		addTestFile(tmpDir, 'docs/adr/ADR-20260922-adopt-a-stable-interface.md', transform(validAdr()));

		const violations = await rule.analyze(context());

		expect(violations.some((violation) => violation.message.includes('blank line'))).toBe(true);
	});

	it.each([
		{
			name: 'a missing section',
			transform: (content: string) => content.replace('## Consequences', '### Consequences'),
		},
		{
			name: 'an additional H2 section',
			transform: (content: string) => content.replace('## Links', '## Notes\n\nNotes.\n\n## Links'),
		},
		{
			name: 'reordered sections',
			transform: (content: string) =>
				content
					.replace('## Context', '## Decision')
					.replace('## Decision\n\nWe will', '## Context\n\nWe will'),
		},
	])('flags $name', async ({ transform }) => {
		addTestFile(tmpDir, 'docs/adr/ADR-20260922-adopt-a-stable-interface.md', transform(validAdr()));

		const violations = await rule.analyze(context());

		expect(violations.some((violation) => violation.message.includes('required H2 sections'))).toBe(
			true,
		);
	});

	it('flags an empty section body', async () => {
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260922-adopt-a-stable-interface.md',
			validAdr().replace(
				'## Decision\n\nWe will use a stable interface.\n\n## Alternatives',
				'## Decision\n\n## Alternatives',
			),
		);

		const violations = await rule.analyze(context());

		expect(violations.some((violation) => violation.message.includes('nonempty content'))).toBe(
			true,
		);
	});

	it('allows normal Markdown spacing inside a section body', async () => {
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260922-adopt-a-stable-interface.md',
			validAdr({ context: 'First paragraph.\n\nSecond paragraph.\n\n- One\n- Two' }),
		);

		await expect(rule.analyze(context())).resolves.toEqual([]);
	});

	it('flags paragraph lines longer than 100 characters', async () => {
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260922-adopt-a-stable-interface.md',
			validAdr({ context: 'a'.repeat(101) }),
		);

		const violations = await rule.analyze(context());

		expect(
			violations.some((violation) => violation.message.includes('must not exceed 100 characters')),
		).toBe(true);
	});

	it('allows Links field lines longer than 100 characters', async () => {
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260828-obtain-trigger-output-before-creating-the-execution.md',
			validAdr({
				title: 'Obtain trigger output before creating the execution',
				date: '2026-08-28',
			}),
		);
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260904-store-the-workflow-revision-that-ran-with-the-execution.md',
			validAdr({
				title: 'Store the workflow revision that ran with the execution',
				date: '2026-09-04',
			}),
		);
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260922-adopt-a-stable-interface.md',
			validAdr({
				relatedAdrs:
					'ADR-20260828-obtain-trigger-output-before-creating-the-execution, ' +
					'ADR-20260904-store-the-workflow-revision-that-ran-with-the-execution',
			}),
		);

		await expect(rule.analyze(context())).resolves.toEqual([]);
	});

	it.each([
		{
			name: 'a missing Links field',
			transform: (content: string) => content.replace('\n\nDocumentation: -', ''),
		},
		{
			name: 'a multiline Links value',
			transform: (content: string) =>
				content.replace('Documentation: -', 'Documentation: first\nsecond'),
		},
		{
			name: 'missing spacing in Links',
			transform: (content: string) =>
				content.replace('RFC: -\n\nDocumentation', 'RFC: -\nDocumentation'),
		},
	])('flags $name', async ({ transform }) => {
		addTestFile(tmpDir, 'docs/adr/ADR-20260922-adopt-a-stable-interface.md', transform(validAdr()));

		const violations = await rule.analyze(context());

		expect(violations.some((violation) => violation.message.includes('Links section'))).toBe(true);
	});

	it('flags placeholder values in the Links section', async () => {
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260922-adopt-a-stable-interface.md',
			validAdr({ documentation: '<link when available>' }),
		);

		const violations = await rule.analyze(context());

		expect(violations.some((violation) => violation.message.includes('Links section'))).toBe(true);
	});

	it('resolves ADR IDs anywhere in the document', async () => {
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260922-adopt-a-stable-interface.md',
			validAdr({ context: 'This replaces ADR-20260921-use-an-old-interface.' }),
		);
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260921-use-an-old-interface.md',
			validAdr({ title: 'Use an old interface', date: '2026-09-21' }),
		);

		await expect(rule.analyze(context())).resolves.toEqual([]);
	});

	it('flags a missing local ADR reference and an n8n repository URL', async () => {
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260922-adopt-a-stable-interface.md',
			validAdr({
				context:
					'See ADR-20260920-missing and https://github.com/n8n-io/n8n/blob/master/docs/adr/ADR-20260919-also-missing.md.',
			}),
		);

		const violations = await rule.analyze(context());

		expect(
			violations.filter((violation) => violation.message.includes('does not exist')),
		).toHaveLength(2);
	});

	it('exempts ADR IDs inside URLs to other repositories', async () => {
		addTestFile(
			tmpDir,
			'docs/adr/ADR-20260922-adopt-a-stable-interface.md',
			validAdr({
				context:
					'See https://github.com/acme/example/blob/main/docs/ADR-20260920-external-choice.md.',
			}),
		);

		await expect(rule.analyze(context())).resolves.toEqual([]);
	});
});
