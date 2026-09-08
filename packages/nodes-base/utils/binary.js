import { utils as xlsxUtils, write as xlsxWrite } from '@e965/xlsx';
import { flattenObject } from '@utils/utilities';
import iconv from 'iconv-lite';
import get from 'lodash/get';
import { deepCopy, NodeOperationError, BINARY_ENCODING } from 'n8n-workflow';
export async function convertJsonToSpreadsheetBinary(items, fileFormat, options, defaultFileName = 'spreadsheet') {
    const itemData = [];
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        itemData.push(flattenObject(items[itemIndex].json));
    }
    let sheetToJsonOptions;
    if (options.headerRow === false) {
        sheetToJsonOptions = { skipHeader: true };
    }
    const sheet = xlsxUtils.json_to_sheet(itemData, sheetToJsonOptions);
    const writingOptions = {
        bookType: fileFormat,
        bookSST: false,
        type: 'buffer',
    };
    if (fileFormat === 'csv' && options.delimiter?.length) {
        writingOptions.FS = options.delimiter ?? ',';
    }
    if (['xlsx', 'ods'].includes(fileFormat) && options.compression) {
        writingOptions.compression = true;
    }
    // Convert the data in the correct format
    const sheetName = options.sheetName || 'Sheet';
    const workbook = {
        SheetNames: [sheetName],
        Sheets: {
            [sheetName]: sheet,
        },
    };
    const buffer = xlsxWrite(workbook, writingOptions);
    const fileName = options.fileName !== undefined ? options.fileName : `${defaultFileName}.${fileFormat}`;
    const binaryData = await this.helpers.prepareBinaryData(buffer, fileName);
    return binaryData;
}
export async function createBinaryFromJson(data, options) {
    let value;
    if (options.sourceKey) {
        value = get(data, options.sourceKey);
    }
    else {
        value = data;
    }
    if (value === undefined) {
        throw new NodeOperationError(this.getNode(), `The value in "${options.sourceKey}" is not set`, {
            itemIndex: options.itemIndex || 0,
        });
    }
    let buffer;
    if (!options.dataIsBase64) {
        let valueAsString = value;
        if (typeof value === 'object') {
            options.mimeType = 'application/json';
            if (options.format) {
                valueAsString = JSON.stringify(value, null, 2);
            }
            else {
                valueAsString = JSON.stringify(value);
            }
        }
        buffer = iconv.encode(valueAsString, options.encoding || 'utf8', {
            addBOM: options.addBOM,
        });
    }
    else {
        buffer = Buffer.from(value, BINARY_ENCODING);
    }
    const binaryData = await this.helpers.prepareBinaryData(buffer, options.fileName, options.mimeType);
    if (!binaryData.fileName) {
        const fileExtension = binaryData.fileExtension ? `.${binaryData.fileExtension}` : '';
        binaryData.fileName = `file${fileExtension}`;
    }
    return binaryData;
}
const parseText = (textContent) => {
    let lastY = undefined;
    const text = [];
    for (const item of textContent.items) {
        if ('str' in item) {
            if (lastY == item.transform[5] || !lastY) {
                text.push(item.str);
            }
            else {
                text.push(`\n${item.str}`);
            }
            lastY = item.transform[5];
        }
    }
    return text.join('');
};
export async function extractDataFromPDF(binaryPropertyName, password, maxPages, joinPages = true, itemIndex = 0) {
    const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
    let buffer;
    if (binaryData.id) {
        const stream = await this.helpers.getBinaryStream(binaryData.id);
        buffer = await this.helpers.binaryToBuffer(stream);
    }
    else {
        buffer = Buffer.from(binaryData.data, BINARY_ENCODING);
    }
    // Polyfill DOMMatrix for pdfjs-dist in Node.js environments without canvas
    if (typeof globalThis.DOMMatrix === 'undefined') {
        const { default: DOMMatrix } = await import('@thednp/dommatrix');
        globalThis.DOMMatrix = DOMMatrix;
    }
    const { getDocument: readPDF, version: pdfJsVersion } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const document = await readPDF({
        password,
        isEvalSupported: false,
        data: new Uint8Array(buffer),
    }).promise;
    const { info, metadata } = await document
        .getMetadata()
        .catch(() => ({ info: null, metadata: null }));
    const pages = [];
    if (maxPages !== 0) {
        let pagesToRead = document.numPages;
        if (maxPages && maxPages < document.numPages) {
            pagesToRead = maxPages;
        }
        for (let i = 1; i <= pagesToRead; i++) {
            const page = await document.getPage(i);
            const text = await page.getTextContent().then(parseText);
            pages.push(text);
        }
    }
    const text = joinPages ? pages.join('\n\n') : pages;
    const returnData = {
        numpages: document.numPages,
        numrender: document.numPages,
        info,
        metadata: (metadata && Object.fromEntries([...metadata])) ?? undefined,
        text,
        version: pdfJsVersion,
    };
    return returnData;
}
export function prepareBinariesDataList(data) {
    if (Array.isArray(data))
        return data;
    if (typeof data === 'object')
        return [data];
    return data.split(',').map((item) => item.trim());
}
/**
 * Splits a database row into binary fields and JSON-safe fields: values recognized as binary
 * (Buffers by default) are routed to `binary` via `prepareBinaryData`, and the rest are
 * deep-copied so driver-native values (Dates, ObjectIds, ...) serialize to plain JSON.
 * Pass `toBuffer` to recognize driver-specific binary wrappers (e.g. MongoDB's `Binary`).
 */
export async function routeBinaryProperties(row, toBuffer = (value) => Buffer.isBuffer(value) ? value : undefined) {
    const json = new Map();
    const binary = new Map();
    for (const [key, value] of Object.entries(row)) {
        const buffer = toBuffer(value);
        if (buffer) {
            binary.set(key, await this.helpers.prepareBinaryData(buffer, key));
        }
        else {
            json.set(key, deepCopy(value));
        }
    }
    return { json: Object.fromEntries(json), binary: Object.fromEntries(binary) };
}
//# sourceMappingURL=binary.js.map