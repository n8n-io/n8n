import { describe, expect, it } from 'vitest';

import {
	containsAdrReference,
	findAdrReferences,
	findLongParagraphLines,
	getHeadings,
	getParagraphs,
	hasExactMetadataSpacing,
	hasOnlyParagraphsAfterHeading,
	lineForField,
	parseField,
	parseMarkdown,
	parseMetadata,
	validateHeadings,
} from './adr-conventions-markdown.js';

const metadataSource = `# Use a parser

Date: 2026-09-22

Status: Active

Decision Owner: Catalysts

## Context

Context.
`;

const sectionsSource = `## Context

Context.

## Decision

Decision.

## Alternatives Considered

Alternatives.

## Consequences

Consequences.

## Links

RFC: -
`;

describe('ADR convention Markdown', () => {
	describe('parseMarkdown', () => {
		it('returns source lines and parsed tokens', () => {
			const parsed = parseMarkdown('# Title\n');

			expect(parsed.lines).toEqual(['# Title', '']);
			expect(parsed.tokens.some((token) => token.type === 'heading_open')).toBe(true);
		});
	});

	describe('getHeadings', () => {
		it('gets only top-level Markdown headings', () => {
			const parsed = parseMarkdown(
				'# Title\n\n```md\n## In code\n```\n\n> ## In a quote\n\n- ### In a list\n\n## Context\n',
			);

			expect(getHeadings(parsed.tokens)).toEqual([
				{ level: 1, content: 'Title', line: 0 },
				{ level: 2, content: 'Context', line: 10 },
			]);
		});
	});

	describe('getParagraphs', () => {
		it('gets only top-level paragraphs', () => {
			const parsed = parseMarkdown('Top level.\n\n> Nested.\n');

			expect(getParagraphs(parsed.tokens)).toEqual([
				{ content: 'Top level.', line: 0, endLine: 1 },
			]);
		});
	});

	describe('findLongParagraphLines', () => {
		it('allows paragraph lines with 100 characters', () => {
			const parsed = parseMarkdown(`${'a'.repeat(100)}\n`);

			expect(findLongParagraphLines(parsed, 100)).toEqual([]);
		});

		it('finds each paragraph line with more than 100 characters', () => {
			const parsed = parseMarkdown(`${'a'.repeat(101)}\nshort line\n${'b'.repeat(102)}\n`);

			expect(findLongParagraphLines(parsed, 100)).toEqual([
				{ line: 0, length: 101 },
				{ line: 2, length: 102 },
			]);
		});

		it('ignores long code block lines', () => {
			const parsed = parseMarkdown(`\`\`\`text\n${'a'.repeat(101)}\n\`\`\`\n`);

			expect(findLongParagraphLines(parsed, 100)).toEqual([]);
		});
	});

	describe('hasOnlyParagraphsAfterHeading', () => {
		it('accepts paragraphs and rejects other block types', () => {
			const paragraphs = parseMarkdown('## Links\n\nRFC: -\n\nDocumentation: -\n');
			const list = parseMarkdown('## Links\n\nRFC: -\n\n- Extra\n');

			expect(hasOnlyParagraphsAfterHeading(paragraphs.tokens, 0)).toBe(true);
			expect(hasOnlyParagraphsAfterHeading(list.tokens, 0)).toBe(false);
		});
	});

	describe('validateHeadings', () => {
		it('checks the required section names and order', () => {
			const valid = validateHeadings(parseMarkdown(sectionsSource).tokens);
			const invalid = validateHeadings(
				parseMarkdown(sectionsSource.replace('## Decision', '## Choice')).tokens,
			);

			expect(valid).toEqual({ valid: true, indexes: [0, 4, 8, 12, 16], line: 1 });
			expect(invalid.valid).toBe(false);
		});

		it('does not accept required sections nested in blockquotes', () => {
			const nestedSections = sectionsSource
				.split('\n')
				.map((line) => `> ${line}`)
				.join('\n');

			expect(validateHeadings(parseMarkdown(nestedSections).tokens).valid).toBe(false);
		});
	});

	describe('parseMetadata', () => {
		it('parses ordered metadata before the Context section', () => {
			const parsed = parseMarkdown(metadataSource);
			const metadata = parseMetadata(parsed.tokens, 8);

			expect(metadata.valid).toBe(true);
			expect(metadata.values).toEqual(
				new Map([
					['Date', '2026-09-22'],
					['Status', 'Active'],
					['Decision Owner', 'Catalysts'],
				]),
			);
			expect(metadata.fieldIndexes).toEqual([2, 4, 6]);
			expect(lineForField(metadata, 'Status')).toBe(5);
			expect(lineForField(metadata, 'Source')).toBe(metadata.line);
		});
	});

	describe('parseField', () => {
		it.each([
			['Status: Active', { key: 'Status', value: 'Active' }],
			['Status:', { key: 'Status', value: '' }],
			['Status:Active', undefined],
			['Status', undefined],
		])('parses %j as expected', (source, expected) => {
			expect(parseField(source)).toEqual(expected);
		});
	});

	describe('hasExactMetadataSpacing', () => {
		it('checks metadata and Context line spacing', () => {
			expect(hasExactMetadataSpacing([2, 4, 6], 8)).toBe(true);
			expect(hasExactMetadataSpacing([2, 3, 6], 8)).toBe(false);
		});
	});

	describe('containsAdrReference', () => {
		it('detects only complete ADR IDs', () => {
			expect(containsAdrReference('See ADR-20260922-use-a-parser.')).toBe(true);
			expect(containsAdrReference('See ADR-20260922.')).toBe(false);
		});
	});

	describe('findAdrReferences', () => {
		it('finds local references and ignores external repository URLs', () => {
			const parsed = parseMarkdown(
				'See ADR-20260922-local, https://github.com/acme/example/ADR-20260921-external.md, and https://github.com/n8n-io/n8n/blob/master/docs/adr/ADR-20260920-n8n.md.\n',
			);

			expect(findAdrReferences(parsed).map(({ reference }) => reference)).toEqual([
				'ADR-20260922-local',
				'ADR-20260920-n8n',
			]);
		});
	});
});
