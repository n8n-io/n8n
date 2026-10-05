import iconv from 'iconv-lite';
import { Readable } from 'node:stream';
import { jsonParse, UserError } from 'n8n-workflow';

import { readPdf } from '@utils/binary';

import {
	readCsvRows,
	readWorkbook,
	sheetRowsOf,
} from '../../SpreadsheetFile/v2/fromFile.operation';

/** A file of the n8n binary data store, as the `parsers` import of a contract node gives it. */
interface StoredFile {
	read(): AsyncIterable<Uint8Array>;
}

interface TextOptions {
	encoding?: string;
	stripBom?: boolean;
}

/** A format and its options, as `parsers.extract` of `@n8n/node-sdk` asks. The SDK checked them. */
export type ExtractRequest =
	| {
			format: 'csv';
			options: {
				delimiter?: string;
				fromLine?: number;
				maxRows?: number;
				header?: boolean;
				includeEmptyCells?: boolean;
				relaxQuotes?: boolean;
				encoding?: BufferEncoding;
				bom?: boolean;
			};
	  }
	| {
			format: 'xlsx';
			options: { sheet?: string; range?: string; header?: boolean; includeEmptyCells?: boolean };
	  }
	| { format: 'json' | 'text'; options: TextOptions }
	| { format: 'pdf'; options: { password?: string; maxPages?: number } };

async function bufferOf(file: StoredFile) {
	const chunks: Uint8Array[] = [];
	for await (const chunk of file.read()) chunks.push(chunk);
	return Buffer.concat(chunks);
}

async function textOf(file: StoredFile, { encoding = 'utf8', stripBom = true }: TextOptions) {
	if (!iconv.encodingExists(encoding)) {
		throw new UserError(`The text encoding "${encoding}" is not known`);
	}
	return iconv.decode(await bufferOf(file), encoding, { stripBOM: stripBom });
}

// SheetJS leaves a hole for an empty cell of a row list.
const cellsOf = (row: unknown) =>
	Array.isArray(row) ? Array.from(row, (cell: unknown) => cell ?? null) : row;

/**
 * Reads a file with the parsers of the Extract from File node, for the `parsers` import of
 * contract nodes. A CSV file streams; the other formats read the whole file.
 */
export async function extractFile(file: StoredFile, request: ExtractRequest): Promise<unknown> {
	switch (request.format) {
		case 'csv': {
			const { maxRows, header, includeEmptyCells, bom, ...rest } = request.options;
			return await readCsvRows(Readable.from(file.read(), { objectMode: false }), {
				...rest,
				maxRowCount: maxRows,
				enableBOM: bom,
				headerRow: header,
				// A row list keeps the position of each cell, so it keeps the empty cells.
				includeEmptyCells: header === false || includeEmptyCells,
			});
		}
		case 'xlsx': {
			const { sheet, header, ...rest } = request.options;
			const workbook = readWorkbook(await bufferOf(file), {});
			const name = sheet ?? workbook.SheetNames[0];
			if (name === undefined) throw new UserError('The spreadsheet has no sheet');
			if (!workbook.SheetNames.includes(name)) {
				throw new UserError(`The spreadsheet has no sheet "${name}"`);
			}
			return sheetRowsOf(workbook.Sheets[name], { ...rest, headerRow: header }).map(cellsOf);
		}
		case 'json': {
			const text = await textOf(file, request.options);
			return text === '' ? {} : jsonParse(text, { errorMessage: 'The file is not in JSON format' });
		}
		case 'text':
			return await textOf(file, request.options);
		case 'pdf': {
			const { numpages, info, metadata, pages } = await readPdf(
				new Uint8Array(await bufferOf(file)),
				request.options,
			);
			return {
				pages,
				pageCount: numpages,
				...(info ? { info } : {}),
				...(metadata ? { metadata } : {}),
			};
		}
	}
}
