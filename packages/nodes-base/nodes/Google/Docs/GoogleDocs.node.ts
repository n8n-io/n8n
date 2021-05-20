import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	googleApiRequest,
	hasKeys,
} from './GenericFunctions';

import {
	documentFields,
	documentOperations,
} from './DocumentDescription';

import {
	IUpdateBody,
	IUpdateFields,
} from './interfaces';

export class GoogleDocs implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Docs',
		name: 'googleDocs',
		icon: 'file:googleDocs.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Google Docs API.',
		defaults: {
			name: 'Google Docs',
			color: '#1a73e8',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleDocsOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Document',
						value: 'document',
					},
				],
				default: 'document',
				description: 'The resource to operate on.',
			},
			...documentOperations,
			...documentFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;

		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {

			try {

				if (resource === 'document') {

					if (operation === 'create') {

						// https://developers.google.com/docs/api/reference/rest/v1/documents/create

						const body: IDataObject = {
							title: this.getNodeParameter('title', i) as string,
						};

						responseData = await googleApiRequest.call(this, 'POST', '/documents', body);

					} else if (operation === 'get') {

						// https://developers.google.com/docs/api/reference/rest/v1/documents/get

						const documentId = this.getNodeParameter('documentId', i) as string;
						responseData = await googleApiRequest.call(this, 'GET', `/documents/${documentId}`);

					} else if (operation === 'update') {

						// https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate

						const documentId = this.getNodeParameter('documentId', i) as string;
						const { writeControl, requestsUi } = this.getNodeParameter('updateFields', i) as IUpdateFields;

						const body = {
							requests: [],
						} as IUpdateBody;

						if (hasKeys(writeControl)) {
							const { control, value } = writeControl.writeControlObject;
							body.writeControl = {
								[control]: value,
							};
						}

						if (hasKeys(requestsUi)) {
							const {
								createFooterValues,
								createHeaderValues,
								createNamedRangeValues,
								createParagraphBulletsValues,
								deleteFooterValues,
								deleteHeaderValues,
								deleteNamedRangeValues,
								deleteParagraphBulletsValues,
								deletePositionedObjectValues,
								deleteTableColumnValues,
								deleteTableRowValues,
								insertPageBreakValues,
								insertTableValues,
								insertTableColumnValues,
								insertTableRowValues,
								insertTextValues,
								replaceAllTextValues,
							} = requestsUi;

							// ----------------------------------
							//         replace values
							// ----------------------------------

							if (replaceAllTextValues.length) {
								replaceAllTextValues.forEach(({ replaceText, text, matchCase }) => {
									body.requests.push({
										replaceAllText: {
											replaceText,
											containsText: { text, matchCase },
										},
									});
								});
							}

							// ----------------------------------
							//         insert values
							// ----------------------------------

							if (insertTextValues.length) {
								insertTextValues.forEach(({ text, locationChoice, segmentId, index }) => {
									body.requests.push({
										insertText: {
											text,
											[locationChoice]: {
												segmentId,
												...(locationChoice === 'location') ? { index }: {},
											},
										},
									});
								});
							}

							if (insertPageBreakValues.length) {
								insertPageBreakValues.forEach(({ locationChoice, segmentId, index }) => {
									body.requests.push({
										insertPageBreak: {
											[locationChoice]: {
												segmentId,
												...(locationChoice === 'location') ? { index }: {},
											},
										},
									});
								});
							}

							if (insertTableValues.length) {
								insertTableValues.forEach(value => {
									const { rows, columns, locationChoice, segmentId, index } = value;
									body.requests.push({
										insertTable: {
											rows,
											columns,
											[locationChoice]: {
												segmentId,
												...(locationChoice === 'location') ? { index }: {},
											},
										},
									});
								});
							}

							if (insertTableRowValues.length) {
								insertTableRowValues.forEach(value => {
									const { insertBelow, rowIndex, columnIndex, segmentId, index } = value;
									body.requests.push({
										insertTableRow: {
											insertBelow,
											tableCellLocation: {
												rowIndex,
												columnIndex,
												tableStartLocation: { segmentId, index },
											},
										},
									});
								});
							}

							if (insertTableColumnValues.length) {
								insertTableColumnValues.forEach(value => {
									const { insertRight, rowIndex, columnIndex, segmentId, index } = value;
									body.requests.push({
										insertTableColumn: {
											insertRight,
											tableCellLocation: {
												rowIndex,
												columnIndex,
												tableStartLocation: { segmentId, index },
											},
										},
									});
								});
							}

							// ----------------------------------
							//         create values
							// ----------------------------------

							if (createParagraphBulletsValues.length) {
								createParagraphBulletsValues.forEach(value => {
									const { bulletPreset, segmentId, startIndex, endIndex } = value;
									body.requests.push({
										createParagraphBullets: {
											bulletPreset,
											range: { segmentId, startIndex, endIndex },
										},
									});
								});
							}

							if (createNamedRangeValues.length) {
								createNamedRangeValues.forEach(value => {
									const { name, segmentId, startIndex, endIndex } = value;
									body.requests.push({
										createNamedRange: {
											name,
											range: { segmentId, startIndex, endIndex },
										},
									});
								});
							}

							if (createHeaderValues.length) {
								createHeaderValues.forEach(({ type, segmentId, index }) => {
									body.requests.push({
										createHeader: {
											type,
											sectionBreakLocation: { segmentId, index },
										},
									});
								});
							}

							if (createFooterValues.length) {
								createFooterValues.forEach(({ type, segmentId, index }) => {
									body.requests.push({
										createFooter: {
											type,
											sectionBreakLocation: { segmentId, index },
										},
									});
								});
							}

							// ----------------------------------
							//         delete values
							// ----------------------------------

							if (deleteParagraphBulletsValues.length) {
								deleteParagraphBulletsValues.forEach(value => {
									const { segmentId, startIndex, endIndex } = value;
									body.requests.push({
										deleteParagraphBullets: {
											range: { segmentId, startIndex, endIndex },
										},
									});
								});
							}

							if (deleteNamedRangeValues.length) {
								deleteNamedRangeValues.forEach(({ namedRangeReference, value }) => {
									body.requests.push({
										deleteNamedRange: {
											[namedRangeReference]: value,
										},
									});
								});
							}

							if (deletePositionedObjectValues.length) {
								deletePositionedObjectValues.forEach(({ objectId }) => {
									body.requests.push({
										deletePositionedObject: { objectId },
									});
								});
							}

							if (deleteTableRowValues.length) {
								deleteTableRowValues.forEach(value => {
									const { rowIndex, columnIndex, segmentId, index } = value;
									body.requests.push({
										deleteTableRow: {
											tableCellLocation: {
												rowIndex,
												columnIndex,
												tableStartLocation: { segmentId, index },
											},
										},
									});
								});
							}

							if (deleteTableColumnValues.length) {
								deleteTableColumnValues.forEach(value => {
									const { rowIndex, columnIndex, segmentId, index } = value;
									body.requests.push({
										deleteTableColumn: {
											tableCellLocation: {
												rowIndex,
												columnIndex,
												tableStartLocation: { segmentId, index },
											},
										},
									});
								});
							}

							if (deleteHeaderValues.length) {
								deleteHeaderValues.forEach(({ headerId }) => {
									body.requests.push({
										deleteHeader: { headerId },
									});
								});
							}

							if (deleteFooterValues.length) {
								deleteFooterValues.forEach(({ footerId }) => {
									body.requests.push({
										deleteFooter: { footerId },
									});
								});
							}
						}

						responseData = await googleApiRequest.call(this, 'POST', `/documents/${documentId}:batchUpdate`, body);

					}
				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
