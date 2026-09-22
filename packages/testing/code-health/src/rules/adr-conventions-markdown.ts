/** Parses ADR Markdown and extracts its structural data. */
import MarkdownIt from 'markdown-it';
import type { Token } from 'markdown-it';

const ADR_REFERENCE = /\bADR-\d{8}-[a-z0-9]+(?:-[a-z0-9]+)*\b/g;
const HAS_ADR_REFERENCE = /\bADR-\d{8}-[a-z0-9]+(?:-[a-z0-9]+)*\b/;
export const REQUIRED_SECTIONS = [
	'## Context',
	'## Decision',
	'## Alternatives Considered',
	'## Consequences',
	'## Links',
];
const REQUIRED_METADATA = ['Date', 'Status', 'Decision Owner'];
export const OPTIONAL_METADATA = ['Source', 'Supersedes', 'Superseded by'];

// Linkify identifies bare external URLs when ADR references are checked.
const markdown = new MarkdownIt({ linkify: true });

export interface ParsedMarkdown {
	lines: string[];
	tokens: Token[];
}

interface Heading {
	level: number;
	content: string;
	line: number;
}

export interface Paragraph {
	content: string;
	line: number;
	endLine: number;
}

export interface ParsedMetadata {
	valid: boolean;
	values: Map<string, string>;
	fieldIndexes: number[];
	fieldLines: Map<string, number>;
	line: number;
}

export interface AdrReferenceOccurrence {
	reference: string;
	line: number;
	column: number;
}

export interface LongParagraphLine {
	line: number;
	length: number;
}

/** Parses Markdown into normalized lines and tokens. */
export function parseMarkdown(source: string): ParsedMarkdown {
	return {
		lines: source.split('\n'),
		tokens: markdown.parse(source, {}),
	};
}

/** Gets all parsed Markdown headings. */
export function getHeadings(tokens: Token[]): Heading[] {
	return tokens.flatMap((token, index) => {
		if (token.type !== 'heading_open' || !token.map) return [];
		const inline = tokens[index + 1];
		if (inline?.type !== 'inline') return [];
		return [{ level: Number(token.tag.slice(1)), content: inline.content, line: token.map[0] }];
	});
}

/** Gets all top-level Markdown paragraphs. */
export function getParagraphs(tokens: Token[]): Paragraph[] {
	return tokens.flatMap((token, index) => {
		if (token.type !== 'paragraph_open' || token.level !== 0 || !token.map) return [];
		const inline = tokens[index + 1];
		if (inline?.type !== 'inline') return [];
		return [{ content: inline.content, line: token.map[0], endLine: token.map[1] }];
	});
}

/** Finds paragraph lines that exceed the specified length. */
export function findLongParagraphLines(
	parsed: ParsedMarkdown,
	maxLength: number,
): LongParagraphLine[] {
	const paragraphLines = new Set<number>();

	for (const token of parsed.tokens) {
		if (token.type !== 'paragraph_open' || !token.map) continue;
		for (let line = token.map[0]; line < token.map[1]; line++) paragraphLines.add(line);
	}

	return [...paragraphLines].flatMap((line) => {
		const length = parsed.lines[line]?.length ?? 0;
		return length > maxLength ? [{ line, length }] : [];
	});
}

/** Checks that only paragraphs follow the selected heading. */
export function hasOnlyParagraphsAfterHeading(tokens: Token[], headingLine: number): boolean {
	const headingIndex = tokens.findIndex(
		(token) => token.type === 'heading_open' && token.map?.[0] === headingLine,
	);
	if (headingIndex === -1) return false;
	const trailingTypes = tokens.slice(headingIndex + 3).map((token) => token.type);
	return trailingTypes.every(
		(type, index) => ['paragraph_open', 'inline', 'paragraph_close'][index % 3] === type,
	);
}

/** Checks the required ADR section headings and order. */
export function validateHeadings(tokens: Token[]): {
	valid: boolean;
	indexes: number[];
	line: number;
} {
	const headings = getHeadings(tokens).filter((heading) => heading.level === 2);
	const valid =
		headings.length === REQUIRED_SECTIONS.length &&
		headings.every(({ content }, index) => `## ${content.trim()}` === REQUIRED_SECTIONS[index]);
	return {
		valid,
		indexes: headings.map(({ line }) => line),
		line: (headings[0]?.line ?? 0) + 1,
	};
}

/** Parses the metadata paragraphs before the Context section. */
export function parseMetadata(tokens: Token[], contextIndex: number): ParsedMetadata {
	const blocks = getParagraphs(tokens).filter(
		(block) => block.line > 0 && (contextIndex === -1 || block.line < contextIndex),
	);
	const entries = blocks.flatMap((block) => {
		const parsed = block.endLine === block.line + 1 ? parseField(block.content) : undefined;
		return parsed ? [{ parsed, index: block.line }] : [];
	});
	const keys = entries.map(({ parsed }) => parsed.key);
	const requiredValid = REQUIRED_METADATA.every((key, index) => keys[index] === key);
	const optionalKeys = keys.slice(REQUIRED_METADATA.length);
	const optionalValid = optionalKeys.every(
		(key, index) =>
			OPTIONAL_METADATA.includes(key) &&
			OPTIONAL_METADATA.indexOf(key) > OPTIONAL_METADATA.indexOf(optionalKeys[index - 1] ?? ''),
	);
	const allKnown = keys.every((key) => [...REQUIRED_METADATA, ...OPTIONAL_METADATA].includes(key));
	const noDuplicates = new Set(keys).size === keys.length;

	return {
		valid:
			entries.length === blocks.length &&
			requiredValid &&
			optionalValid &&
			allKnown &&
			noDuplicates &&
			entries.length === REQUIRED_METADATA.length + optionalKeys.length,
		values: new Map(entries.map(({ parsed }) => [parsed.key, parsed.value])),
		fieldIndexes: entries.map(({ index }) => index),
		fieldLines: new Map(entries.map(({ parsed, index }) => [parsed.key, index + 1])),
		line: (entries[0]?.index ?? 1) + 1,
	};
}

/** Parses a single key and value field. */
export function parseField(line: string): { key: string; value: string } | undefined {
	const separator = line.indexOf(':');
	if (separator <= 0) return undefined;
	const remainder = line.slice(separator + 1);
	if (remainder !== '' && !remainder.startsWith(' ')) return undefined;
	return { key: line.slice(0, separator), value: remainder.slice(1) };
}

/** Checks for one blank line between metadata fields. */
export function hasExactMetadataSpacing(fieldIndexes: number[], contextIndex: number): boolean {
	if (contextIndex === -1 || fieldIndexes.length === 0) return false;
	const structuralIndexes = [0, ...fieldIndexes, contextIndex];
	return structuralIndexes.every(
		(index, position) => position === 0 || index - structuralIndexes[position - 1] === 2,
	);
}

/** Gets the source line for a metadata field. */
export function lineForField(metadata: ParsedMetadata, field: string): number {
	return metadata.fieldLines.get(field) ?? metadata.line;
}

/** Checks whether text contains a complete ADR ID. */
export function containsAdrReference(value: string): boolean {
	return HAS_ADR_REFERENCE.test(value);
}

/** Finds local ADR references in parsed Markdown. */
export function findAdrReferences(parsed: ParsedMarkdown): AdrReferenceOccurrence[] {
	const occurrences = new Map<string, AdrReferenceOccurrence>();

	for (const token of parsed.tokens) {
		if (token.type !== 'inline' || !token.map || !token.children) continue;
		let skipLinkText = false;

		for (const child of token.children) {
			if (child.type === 'link_open') {
				const href = child.attrGet('href') ?? '';
				skipLinkText = isExternalUrl(href) && !isN8nRepositoryUrl(href);
				if (!skipLinkText) addReferenceOccurrences(occurrences, href, parsed.lines, token.map);
				continue;
			}
			if (child.type === 'link_close') {
				skipLinkText = false;
				continue;
			}
			if (!skipLinkText && ['text', 'code_inline'].includes(child.type)) {
				addReferenceOccurrences(occurrences, child.content, parsed.lines, token.map);
			}
		}
	}

	return [...occurrences.values()];
}

function addReferenceOccurrences(
	occurrences: Map<string, AdrReferenceOccurrence>,
	content: string,
	lines: string[],
	lineMap: [number, number],
): void {
	for (const match of content.matchAll(ADR_REFERENCE)) {
		const reference = match[0];
		for (let line = lineMap[0]; line < lineMap[1]; line++) {
			const column = lines[line]?.indexOf(reference) ?? -1;
			if (column === -1) continue;
			occurrences.set(`${line}:${column}:${reference}`, { reference, line, column });
			break;
		}
	}
}

function isExternalUrl(value: string): boolean {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

function isN8nRepositoryUrl(rawUrl: string): boolean {
	try {
		const url = new URL(rawUrl);
		return (
			url.hostname.toLowerCase() === 'github.com' && /^\/n8n-io\/n8n(?:\/|$)/i.test(url.pathname)
		);
	} catch {
		return false;
	}
}
