import { utils as xlsxUtils, write as xlsxWrite } from '@e965/xlsx';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { extractFile } from '../extractFile';

const fileOf = (bytes: Buffer | string) => ({
	async *read() {
		yield Buffer.from(bytes);
	},
});

const workbook = () => {
	const book = xlsxUtils.book_new();
	xlsxUtils.book_append_sheet(
		book,
		xlsxUtils.aoa_to_sheet([
			['name', 'score'],
			['Ada', 3],
			[null, 5],
		]),
		'Scores',
	);
	return fileOf(xlsxWrite(book, { type: 'buffer', bookType: 'xlsx' }));
};

describe('extractFile', () => {
	it('reads CSV rows as objects, or as lists that keep the empty cells', async () => {
		const csv = 'name;plan\nAda;pro\nGrace;\n';
		expect(await extractFile(fileOf(csv), { format: 'csv', options: { delimiter: ';' } })).toEqual([
			{ name: 'Ada', plan: 'pro' },
			{ name: 'Grace' },
		]);
		expect(
			await extractFile(fileOf(csv), { format: 'csv', options: { delimiter: ';', header: false } }),
		).toEqual([
			['name', 'plan'],
			['Ada', 'pro'],
			['Grace', ''],
		]);
	});

	it('reads one sheet, with null for an empty cell of a list, and refuses a missing sheet', async () => {
		expect(await extractFile(workbook(), { format: 'xlsx', options: {} })).toEqual([
			{ name: 'Ada', score: 3 },
			{ score: 5 },
		]);
		expect(await extractFile(workbook(), { format: 'xlsx', options: { header: false } })).toEqual([
			['name', 'score'],
			['Ada', 3],
			[null, 5],
		]);
		await expect(
			extractFile(workbook(), { format: 'xlsx', options: { sheet: 'Missing' } }),
		).rejects.toThrow('The spreadsheet has no sheet "Missing"');
	});

	it('reads JSON and text in an encoding', async () => {
		expect(await extractFile(fileOf(''), { format: 'json', options: {} })).toEqual({});
		expect(await extractFile(fileOf('[1,{"a":2}]'), { format: 'json', options: {} })).toEqual([
			1,
			{ a: 2 },
		]);
		await expect(extractFile(fileOf('{a'), { format: 'json', options: {} })).rejects.toThrow(
			'The file is not in JSON format',
		);
		const latin1 = Buffer.from('café', 'latin1');
		expect(
			await extractFile(fileOf(latin1), { format: 'text', options: { encoding: 'latin1' } }),
		).toBe('café');
		await expect(
			extractFile(fileOf(latin1), { format: 'text', options: { encoding: 'klingon' } }),
		).rejects.toThrow('The text encoding "klingon" is not known');
	});

	it('reads the text of each page and the document data of a PDF', async () => {
		const pdf = readFileSync(path.join(__dirname, '../../../ReadPdf/test/sample.pdf'));
		const content = await extractFile(fileOf(pdf), { format: 'pdf', options: {} });
		expect(content).toMatchObject({
			pageCount: 1,
			pages: [expect.stringContaining('Sample PDF')],
			info: expect.objectContaining({ Title: 'sample' }),
		});
		expect(await extractFile(fileOf(pdf), { format: 'pdf', options: { maxPages: 1 } })).toEqual(
			content,
		);
	});
});
