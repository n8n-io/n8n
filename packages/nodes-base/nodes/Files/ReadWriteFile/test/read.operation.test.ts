import { NodeApiError } from 'n8n-workflow';
import type { IBinaryData, IExecuteFunctions, INode } from 'n8n-workflow';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock, mockDeep } from 'vitest-mock-extended';

import { execute } from '../actions/read.operation';

describe('Read/Write Files from Disk, read operation', () => {
	let directory: string;

	const write = async (relativePath: string) => {
		const target = path.join(directory, relativePath);
		await mkdir(path.dirname(target), { recursive: true });
		await writeFile(target, relativePath);
	};

	beforeAll(async () => {
		directory = await mkdtemp(path.join(tmpdir(), 'n8n-read-'));

		for (const file of [
			'prompts/00-core.md',
			'prompts/01-research.md',
			'prompts/99-other.md',
			'VTuber Legend [J-Novel Club]/list.txt',
			'VTuber Legend [J-Novel Club]/ep1.mkv',
			'Report (final)/summary.pdf',
			'alpha/f.txt',
			'beta/f.txt',
			'{drafts}/note.txt',
			'[ab]/x.txt',
			'a/x.txt',
			'alt/cat.txt',
			'alt/dog.txt',
		]) {
			await write(file);
		}
	});

	afterAll(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	const readWith = async (fileSelector: string, literalBrackets?: boolean, typeVersion = 1.1) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(mock<INode>({ typeVersion }));
		context.getNodeParameter.mockImplementation((name) =>
			name === 'fileSelector'
				? fileSelector
				: literalBrackets === undefined
					? {}
					: { literalBrackets },
		);
		context.helpers.prepareBinaryData.mockResolvedValue(mock<IBinaryData>());

		await execute.call(context, [{ json: {} }]);

		return context.helpers.prepareBinaryData.mock.calls
			.map(([, filePath]) => path.basename(filePath as string))
			.sort();
	};

	const failWith = async (fileSelector: string, literalBrackets?: boolean) => {
		const error = await readWith(fileSelector, literalBrackets).then(
			() => undefined,
			(thrown: unknown) => thrown,
		);

		expect(error).toBeInstanceOf(NodeApiError);
		return error as NodeApiError;
	};

	describe('by default', () => {
		it('matches an exact path containing literal square brackets', async () => {
			expect(await readWith(`${directory}/VTuber Legend [J-Novel Club]/list.txt`)).toEqual([
				'list.txt',
			]);
		});

		it('matches a wildcard inside a directory with literal square brackets', async () => {
			expect(await readWith(`${directory}/VTuber Legend [J-Novel Club]/*.mkv`)).toEqual([
				'ep1.mkv',
			]);
		});

		it('matches a wildcard inside a directory with literal parentheses', async () => {
			expect(await readWith(`${directory}/Report (final)/*.pdf`)).toEqual(['summary.pdf']);
		});

		it('still expands braces, which were never escaped', async () => {
			expect(await readWith(`${directory}/{alpha,beta}/f.txt`)).toEqual(['f.txt', 'f.txt']);
		});

		it('honours braces the user escaped themselves', async () => {
			expect(await readWith(`${directory}/\\{drafts\\}/note.txt`)).toEqual(['note.txt']);
		});

		it('honours brackets the user escaped themselves', async () => {
			expect(await readWith(`${directory}/VTuber Legend \\[J-Novel Club\\]/*.mkv`)).toEqual([
				'ep1.mkv',
			]);
		});

		it('reads [ab] as a directory name, not a character class', async () => {
			expect(await readWith(`${directory}/[ab]/x.txt`)).toEqual(['x.txt']);
		});

		it('does not expand a character class, and says the option controls it', async () => {
			const error = await failWith(`${directory}/prompts/[01]*`);

			expect(error.message).toBe('No file(s) found');
			expect(error.description).toContain("turn off 'Treat Brackets and Parentheses as Literal'");
		});

		it('does not mention the option when the selector has no brackets or parens', async () => {
			const error = await failWith(`${directory}/prompts/nope.md`);

			expect(error.description).not.toContain('Treat Brackets and Parentheses');
		});

		it('returns nothing instead of throwing on typeVersion 1', async () => {
			expect(await readWith(`${directory}/prompts/nope.md`, undefined, 1)).toEqual([]);
		});

		it('behaves the same whether the option is absent or explicitly on', async () => {
			const selector = `${directory}/VTuber Legend [J-Novel Club]/list.txt`;

			expect(await readWith(selector, true)).toEqual(await readWith(selector));
		});
	});

	describe('with literal brackets turned off', () => {
		it('matches a glob character class', async () => {
			expect(await readWith(`${directory}/prompts/[01]*`, false)).toEqual([
				'00-core.md',
				'01-research.md',
			]);
		});

		it('matches both the literal directory and the character class', async () => {
			expect(await readWith(`${directory}/[ab]/x.txt`, false)).toEqual(['x.txt', 'x.txt']);
		});

		it('leaves braces alone, exactly as when disabled', async () => {
			expect(await readWith(`${directory}/{alpha,beta}/f.txt`, false)).toEqual(['f.txt', 'f.txt']);
		});

		it('supports alternation groups', async () => {
			expect(await readWith(`${directory}/alt/(cat|dog).txt`, false)).toEqual([
				'cat.txt',
				'dog.txt',
			]);
		});

		it('does not enable extended glob syntax', async () => {
			// `@(` and friends compile to nested quantifiers whose matching cost grows
			// exponentially with the length of a file name
			await expect(readWith(`${directory}/alt/@(cat|dog).txt`, false)).rejects.toThrow(
				'No file(s) found',
			);
		});

		it('no longer matches an unescaped literal bracket path, and says the option would', async () => {
			const error = await failWith(`${directory}/VTuber Legend [J-Novel Club]/list.txt`, false);

			expect(error.description).toContain("turn on 'Treat Brackets and Parentheses as Literal'");
		});
	});
});
