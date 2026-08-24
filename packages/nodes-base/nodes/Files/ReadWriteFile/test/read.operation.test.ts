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

		for (const name of ['00-core.md', '01-research.md', '99-other.md']) {
			await write(path.join('prompts', name));
		}
		for (const name of ['list.txt', 'ep1.mkv']) {
			await write(path.join('VTuber Legend [J-Novel Club]', name));
		}
		await write(path.join('Report (final)', 'summary.pdf'));

		// `[ab]` matches both as a literal name and as a character class
		await write(path.join('[ab]', 'x.txt'));
		await write(path.join('a', 'x.txt'));
	});

	afterAll(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	const readWith = async (fileSelector: string) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
		context.getNodeParameter.mockImplementation((name) =>
			name === 'fileSelector' ? fileSelector : {},
		);
		context.helpers.prepareBinaryData.mockResolvedValue(mock<IBinaryData>());

		await execute.call(context, [{ json: {} }]);

		return context.helpers.prepareBinaryData.mock.calls
			.map(([, filePath]) => path.basename(filePath ?? ''))
			.sort();
	};

	it('matches a glob character class', async () => {
		expect(await readWith(`${directory}/prompts/[01]*`)).toEqual(['00-core.md', '01-research.md']);
	});

	it('matches an exact path containing literal square brackets', async () => {
		expect(await readWith(`${directory}/VTuber Legend [J-Novel Club]/list.txt`)).toEqual([
			'list.txt',
		]);
	});

	it('matches a wildcard inside a directory with literal square brackets', async () => {
		expect(await readWith(`${directory}/VTuber Legend [J-Novel Club]/*.mkv`)).toEqual(['ep1.mkv']);
	});

	it('matches a wildcard inside a directory with literal parentheses', async () => {
		expect(await readWith(`${directory}/Report (final)/*.pdf`)).toEqual(['summary.pdf']);
	});

	it('honours brackets the user escaped themselves', async () => {
		expect(await readWith(`${directory}/VTuber Legend \\[J-Novel Club\\]/*.mkv`)).toEqual([
			'ep1.mkv',
		]);
	});

	it('prefers the literal path over the character class that also matches', async () => {
		expect(await readWith(`${directory}/[ab]/x.txt`)).toEqual(['x.txt']);
	});

	it('throws when nothing matches', async () => {
		await expect(readWith(`${directory}/prompts/nope.md`)).rejects.toThrow('No file(s) found');
	});
});
