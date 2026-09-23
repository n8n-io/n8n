import { BaseRule } from '@n8n/rules-engine';
import type { Violation } from '@n8n/rules-engine';
import { kebabCase } from 'change-case';
import * as path from 'node:path';

import type { CodeHealthContext } from '../context.js';
import { findAdrFiles, findAllowedAdrDirectories, normalizePath } from './adr-conventions-files.js';
import type { AdrFile, AdrFileAccess } from './adr-conventions-files.js';
import {
	containsAdrReference,
	findAdrReferences,
	findLongParagraphLines,
	getHeadings,
	getParagraphs,
	hasExactMetadataSpacing,
	hasOnlyParagraphsAfterHeading,
	lineForField,
	OPTIONAL_METADATA,
	parseField,
	parseMetadata,
	REQUIRED_SECTIONS,
	validateHeadings,
} from './adr-conventions-markdown.js';

const ALLOWED_STATUSES = new Set(['Active', 'Superseded', 'Deprecated']);
const MAX_PARAGRAPH_LINE_LENGTH = 100;

/**
 * Enforces these ADR rules:
 * - Store ADRs in a root or workspace package `docs/adr` directory.
 * - Use a unique `ADR-YYYYMMDD-kebab-case-title.md` file name.
 * - Start with one H1 title that matches the file name.
 * - Use the required H2 sections once and in the required order.
 * - Add nonempty content and exact blank-line spacing to each section.
 * - Add ordered Date, Status, and Decision Owner metadata.
 * - Use a valid date, an allowed status, and an allowed owner.
 * - Add optional metadata in order and omit empty optional fields.
 * - Use full ADR IDs in supersession metadata.
 * - Add the required RFC, Documentation, and Related ADRs link fields.
 * - Resolve local ADR references and allow references in external URLs.
 * - Limit paragraph lines to 100 characters.
 * - Apply structural rules to the root ADR template.
 */
export class AdrConventionsRule extends BaseRule<CodeHealthContext> {
	readonly id = 'adr-conventions';
	readonly name = 'ADR Conventions';
	readonly description =
		'Architecture decision records must use the repository naming, location, structure, ownership, and reference conventions.';
	readonly severity = 'error' as const;

	constructor(private readonly fileAccess?: AdrFileAccess) {
		super();
	}

	async analyze(context: CodeHealthContext): Promise<Violation[]> {
		const { rootDir } = context;
		const owners = this.getAllowedOwners();
		const allowedDirectories = await findAllowedAdrDirectories(rootDir, this.fileAccess);
		const files = await findAdrFiles(rootDir, this.fileAccess);
		const ids = new Map<string, AdrFile[]>();

		for (const file of files) {
			if (!file.fileId) continue;
			const matches = ids.get(file.fileId) ?? [];
			matches.push(file);
			ids.set(file.fileId, matches);
		}

		const violations: Violation[] = [];
		for (const file of files) {
			violations.push(...this.validateFile(file, allowedDirectories, owners, ids));
		}

		return violations;
	}

	private getAllowedOwners(): Set<string> {
		const configuredOwners = this.getOptions().allowedOwners;
		return new Set(
			Array.isArray(configuredOwners)
				? configuredOwners.filter((owner): owner is string => typeof owner === 'string')
				: [],
		);
	}

	private validateFile(
		file: AdrFile,
		allowedDirectories: Set<string>,
		owners: Set<string>,
		ids: Map<string, AdrFile[]>,
	): Violation[] {
		const violations: Violation[] = [];
		const { filePath, relativePath, fileName } = file;
		const isTemplate = relativePath === 'docs/ADR_TEMPLATE.md';

		for (const { line, length } of findLongParagraphLines(file, MAX_PARAGRAPH_LINE_LENGTH)) {
			violations.push(
				this.createViolation(
					filePath,
					line + 1,
					MAX_PARAGRAPH_LINE_LENGTH + 1,
					`Paragraph lines must not exceed ${MAX_PARAGRAPH_LINE_LENGTH} characters. This line has ${length} characters.`,
				),
			);
		}

		if (!isTemplate && !allowedDirectories.has(normalizePath(path.dirname(filePath)))) {
			violations.push(
				this.createViolation(
					filePath,
					1,
					1,
					`${relativePath} is outside an allowed ADR directory.`,
					'Place the file in docs/adr at the repository root or at the root of a pnpm workspace package.',
				),
			);
		}

		if (!isTemplate && !file.fileId) {
			violations.push(
				this.createViolation(
					filePath,
					1,
					1,
					`${fileName} does not match ADR-YYYYMMDD-<kebab-case-title>.md.`,
					'Rename the file with a valid date and kebab-case title.',
				),
			);
		} else if (file.fileId && (ids.get(file.fileId)?.length ?? 0) > 1) {
			violations.push(
				this.createViolation(
					filePath,
					1,
					1,
					`${file.fileId} is not unique in the repository.`,
					'Use a unique ADR date and title.',
				),
			);
		}

		const titleHeadings = getHeadings(file.tokens).filter((heading) => heading.level === 1);
		const title = titleHeadings[0]?.line === 0 ? titleHeadings[0].content.trim() : undefined;
		if (!title) {
			violations.push(
				this.createViolation(filePath, 1, 1, 'The ADR must start with one nonempty H1 title.'),
			);
		} else if (!isTemplate && file.fileSlug && kebabCase(title) !== file.fileSlug) {
			violations.push(
				this.createViolation(
					filePath,
					1,
					1,
					`The filename title must be "${kebabCase(title)}" to match the H1.`,
					`Rename the file to ADR-${file.fileDate}-${kebabCase(title)}.md.`,
				),
			);
		}

		const extraTitle = titleHeadings.find((heading, index) => index > 0 || heading.line > 0);
		if (extraTitle) {
			violations.push(
				this.createViolation(
					filePath,
					extraTitle.line + 1,
					1,
					'The ADR must contain only one H1 title.',
				),
			);
		}

		const headingResult = validateHeadings(file.tokens);
		if (!headingResult.valid) {
			violations.push(
				this.createViolation(
					filePath,
					headingResult.line,
					1,
					'The ADR must contain the required H2 sections once and in the prescribed order.',
					`Use these sections: ${REQUIRED_SECTIONS.join(', ')}.`,
				),
			);
		}

		const contextIndex = headingResult.indexes[0] ?? -1;
		const metadata = parseMetadata(file.tokens, contextIndex);
		if (!metadata.valid) {
			violations.push(
				this.createViolation(
					filePath,
					metadata.line,
					1,
					'The ADR metadata fields are missing, duplicated, or out of order.',
					'Use Date, Status, Decision Owner, then optional Source, Supersedes, and Superseded by fields.',
				),
			);
		}

		if (!hasExactMetadataSpacing(file.lines, metadata.fieldIndexes, contextIndex)) {
			violations.push(
				this.createViolation(
					filePath,
					metadata.line,
					1,
					'Use exactly one blank line between the title, metadata fields, and Context heading.',
				),
			);
		}

		const date = metadata.values.get('Date');
		if (!isTemplate && (!date || !isValidIsoDate(date))) {
			violations.push(
				this.createViolation(
					filePath,
					lineForField(metadata, 'Date'),
					1,
					'Date must be a valid calendar date in YYYY-MM-DD format.',
				),
			);
		} else if (!isTemplate && file.fileDate && date?.replaceAll('-', '') !== file.fileDate) {
			violations.push(
				this.createViolation(
					filePath,
					lineForField(metadata, 'Date'),
					1,
					`Date must match ${file.fileDate} from the filename.`,
				),
			);
		}

		const status = metadata.values.get('Status');
		if (!isTemplate && (!status || !ALLOWED_STATUSES.has(status))) {
			violations.push(
				this.createViolation(
					filePath,
					lineForField(metadata, 'Status'),
					1,
					'Status must be Active, Superseded, or Deprecated.',
				),
			);
		}

		const owner = metadata.values.get('Decision Owner');
		if (!isTemplate && (!owner || !owners.has(owner))) {
			violations.push(
				this.createViolation(
					filePath,
					lineForField(metadata, 'Decision Owner'),
					1,
					`Decision Owner must be one of: ${[...owners].join(', ')}.`,
					'If your team is missing, add it to allowedOwners in packages/testing/code-health/src/index.ts.',
				),
			);
		}

		for (const field of OPTIONAL_METADATA) {
			if (isTemplate) continue;

			if (metadata.values.has(field) && !isMeaningfulValue(metadata.values.get(field))) {
				violations.push(
					this.createViolation(
						filePath,
						lineForField(metadata, field),
						1,
						`${field} must contain a value when present. Omit the field when it does not apply.`,
					),
				);
			}

			if (
				(field === 'Supersedes' || field === 'Superseded by') &&
				metadata.values.has(field) &&
				!containsAdrReference(metadata.values.get(field) ?? '')
			) {
				violations.push(
					this.createViolation(
						filePath,
						lineForField(metadata, field),
						1,
						`${field} must contain at least one full ADR ID.`,
					),
				);
			}
		}

		if (headingResult.valid) {
			violations.push(...this.validateSections(file, headingResult.indexes, isTemplate));
		}

		violations.push(...this.validateReferences(file, ids));

		return violations;
	}

	private validateSections(
		file: AdrFile,
		headingIndexes: number[],
		allowPlaceholders: boolean,
	): Violation[] {
		const violations: Violation[] = [];
		const { filePath, lines } = file;

		for (let index = 0; index < headingIndexes.length; index++) {
			const headingIndex = headingIndexes[index];
			if (
				!hasOneBlankLineBefore(lines, headingIndex) ||
				lines[headingIndex + 1] !== '' ||
				lines[headingIndex + 2]?.trim().length === 0
			) {
				violations.push(
					this.createViolation(
						filePath,
						headingIndex + 1,
						1,
						`Use exactly one blank line before and after ${lines[headingIndex]}.`,
					),
				);
			}

			if (index === headingIndexes.length - 1) continue;

			const nextHeadingIndex = headingIndexes[index + 1];
			const body = lines.slice(headingIndex + 2, nextHeadingIndex - 1);
			if (!body.some((line) => line.trim().length > 0)) {
				violations.push(
					this.createViolation(
						filePath,
						headingIndex + 1,
						1,
						`${lines[headingIndex]} must have nonempty content.`,
					),
				);
			}
		}

		const linksIndex = headingIndexes.at(-1)!;
		const linkBlocks = getParagraphs(file.tokens).filter((block) => block.line > linksIndex);
		const linkPattern = ['RFC', 'Documentation', 'Related ADRs'];
		const validLinks =
			linkBlocks.length === linkPattern.length &&
			linkBlocks.every((block, index) => {
				const field = block.endLine === block.line + 1 ? parseField(block.content) : undefined;
				return (
					block.line === linksIndex + 2 + index * 2 &&
					field?.key === linkPattern[index] &&
					(allowPlaceholders || isMeaningfulLinkValue(field.value))
				);
			}) &&
			hasOnlyParagraphsAfterHeading(file.tokens, linksIndex);

		if (!validLinks) {
			violations.push(
				this.createViolation(
					filePath,
					linksIndex + 1,
					1,
					'The Links section must contain single-line RFC, Documentation, and Related ADRs fields separated by one blank line.',
					'Use "-" when a link is not available.',
				),
			);
		}

		return violations;
	}

	private validateReferences(file: AdrFile, ids: Map<string, AdrFile[]>): Violation[] {
		const violations: Violation[] = [];
		for (const occurrence of findAdrReferences(file)) {
			const { reference, line, column } = occurrence;
			if (ids.has(reference)) continue;
			violations.push(
				this.createViolation(
					file.filePath,
					line + 1,
					column + 1,
					`${reference} does not exist in this repository.`,
					'Correct the ADR ID or link to an ADR in another repository.',
				),
			);
		}

		return violations;
	}
}

function isValidIsoDate(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
}

function isMeaningfulValue(value: string | undefined): boolean {
	return (
		value !== undefined && value.trim().length > 0 && value.trim() !== '-' && !isPlaceholder(value)
	);
}

function isMeaningfulLinkValue(value: string | undefined): boolean {
	return value !== undefined && value.trim().length > 0 && !isPlaceholder(value);
}

function isPlaceholder(value: string): boolean {
	return /^<[^>]+>$/.test(value.trim());
}

function hasOneBlankLineBefore(lines: string[], index: number): boolean {
	return index >= 2 && lines[index - 1] === '' && lines[index - 2] !== '';
}
