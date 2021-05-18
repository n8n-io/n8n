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
} from './GenericFunctions';

import {
	documentFields,
	documentOperations,
} from './DocumentDescription';

import {
	isEmpty,
} from 'lodash';

interface IUpdateFields {
	writeControl?: { writeControlObject: { control: string, value: string }  };
	requestsUi?: IDataObject;
};

interface IUpdateBody extends IDataObject{
	requests?: IDataObject[];
	writeControl?: IDataObject;
};
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
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'document') {
					//https://developers.google.com/docs/api/reference/rest/v1/documents/create
					if (operation === 'create') {

						const body: IDataObject = {
							title: this.getNodeParameter('title', i) as string,
						};

						responseData = await googleApiRequest.call(
							this,
							'POST',
							'/documents',
							body,
							qs,
						);

					}
					//https://developers.google.com/docs/api/reference/rest/v1/documents/get
					if (operation === 'get') {

						const documentId = this.getNodeParameter('documentId', i) as string;

						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/documents/${documentId}`,
							{},
							qs,
						);

					}
					//https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
					if (operation === 'update') {

						const documentId = this.getNodeParameter('documentId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IUpdateFields;

						const body: IUpdateBody = {
							requests: [],
						};

						if (!isEmpty(updateFields.writeControl)) {
							const writeControl = updateFields.writeControl?.writeControlObject;
							body.writeControl = {
								[writeControl!.control]: writeControl!.value,
							};
						}

						if (!isEmpty(updateFields.requestsUi)) {
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
							} = updateFields.requestsUi as IDataObject;

							// handle replace all text request
							if (!isEmpty(replaceAllTextValues)) {
								(replaceAllTextValues as IDataObject[]).forEach(replaceAllTextValue => {
									const { replaceText, text, matchCase } = replaceAllTextValue;
									(body.requests as IDataObject[]).push({
										replaceAllText: {
											replaceText,
											containsText: {
												text,
												matchCase,
											},
										},
									});
								});
							}
							// handle insert text request
							if (!isEmpty(insertTextValues)) {
								(insertTextValues as IDataObject[]).forEach(insertTextValue => {
									const { text, locationChoice, segmentId, index } = insertTextValue;
									(body.requests as IDataObject[]).push({
										insertText: {
											text,
											[locationChoice as string]: {
												segmentId,
												...(locationChoice === 'location') ?{
													index: parseInt(index as string, 10),
												}: {},
											},
										},
									});
								});
							}
							// handle insert age break request
							if (!isEmpty(insertPageBreakValues)) {
								(insertPageBreakValues as IDataObject[]).forEach(insertPageBreakValue => {
									const { locationChoice, segmentId, index } = insertPageBreakValue;
									(body.requests as IDataObject[]).push({
										insertPageBreak: {
											[locationChoice as string]: {
												segmentId,
												...(locationChoice === 'location') ?{
													index: parseInt(index as string, 10),
												}: {},
											},
										},
									});
								});
							}
							// handle insert table request
							if (!isEmpty(insertTableValues)) {
								(insertTableValues as IDataObject[]).forEach(insertTableValue => {
									const { rows, columns, locationChoice, segmentId, index } = insertTableValue;
									(body.requests as IDataObject[]).push({
										insertTable: {
											rows,
											columns,
											[locationChoice as string]: {
												segmentId,
												...(locationChoice === 'location') ?{
													index: parseInt(index as string, 10),
												}: {},
											},
										},
									});
								});
							}
							// handle insert table row request
							if (!isEmpty(insertTableRowValues)) {
								(insertTableRowValues as IDataObject[]).forEach(insertTableRowValue => {
									const { insertBelow, rowIndex, columnIndex, segmentId, index } = insertTableRowValue;
									(body.requests as IDataObject[]).push({
										insertTableRow: {
											insertBelow,
											tableCellLocation: {
												rowIndex,
												columnIndex,
												tableStartLocation: {
													segmentId,
													index,
												},
											},
										},
									});
								});
							}
							// handle insert table column request
							if (!isEmpty(insertTableColumnValues)) {
								(insertTableColumnValues as IDataObject[]).forEach(insertTableColumnValue => {
									const { insertRight, rowIndex, columnIndex, segmentId, index } = insertTableColumnValue;
									(body.requests as IDataObject[]).push({
										insertTableColumn: {
											insertRight,
											tableCellLocation: {
												rowIndex,
												columnIndex,
												tableStartLocation: {
													segmentId,
													index,
												},
											},
										},
									});
								});
							}
							// handle create paragraph bullets request
							if (!isEmpty(createParagraphBulletsValues)) {
								(createParagraphBulletsValues as IDataObject[]).forEach(createParagraphBulletsValue => {
									const { bulletPreset, segmentId, startIndex, endIndex } = createParagraphBulletsValue;
									(body.requests as IDataObject[]).push({
										createParagraphBullets: {
											bulletPreset,
											range: {
												segmentId,
												startIndex,
												endIndex,
											},
										},
									});
								});
							}
							// handle delete paragraph bullets request
							if (!isEmpty(deleteParagraphBulletsValues)) {
								(deleteParagraphBulletsValues as IDataObject[]).forEach(deleteParagraphBulletsValue => {
									const { segmentId, startIndex, endIndex } = deleteParagraphBulletsValue;
									(body.requests as IDataObject[]).push({
										deleteParagraphBullets: {
											range: {
												segmentId,
												startIndex,
												endIndex,
											},
										},
									});
								});
							}
							// handle create name range request
							if (!isEmpty(createNamedRangeValues)) {
								(createNamedRangeValues as IDataObject[]).forEach(createNamedRangeValue => {
									const { name, segmentId, startIndex, endIndex } = createNamedRangeValue;
									(body.requests as IDataObject[]).push({
										createNamedRange: {
											name,
											range: {
												segmentId,
												startIndex,
												endIndex,
											},
										},
									});
								});
							}
							// handle delete name range request
							if (!isEmpty(deleteNamedRangeValues)) {
								(deleteNamedRangeValues as IDataObject[]).forEach(deleteNamedRangeValue => {
									const { namedRangeReference, value } = deleteNamedRangeValue;
									(body.requests as IDataObject[]).push({
										deleteNamedRange: {
											[namedRangeReference as string]: value ,
										},
									});
								});
							}
							// handle delete positioned object request
							if (!isEmpty(deletePositionedObjectValues)) {
								(deletePositionedObjectValues as IDataObject[]).forEach(deletePositionedObjectValue => {
									const { objectId } = deletePositionedObjectValue;
									(body.requests as IDataObject[]).push({
										deletePositionedObject: {
											objectId,
										},
									});
								});
							}
							// handle delete table row request
							if (!isEmpty(deleteTableRowValues)) {
								(deleteTableRowValues as IDataObject[]).forEach(deleteTableRowValue => {
									const { rowIndex, columnIndex, segmentId, index } = deleteTableRowValue;
									(body.requests as IDataObject[]).push({
										deleteTableRow: {
											tableCellLocation: {
												rowIndex,
												columnIndex,
												tableStartLocation: {
													segmentId,
													index,
												},
											},
										},
									});
								});
							}
							// handle delete table column request
							if (!isEmpty(deleteTableColumnValues)) {
								(deleteTableColumnValues as IDataObject[]).forEach(deleteTableColumnValue => {
									const { rowIndex, columnIndex, segmentId, index } = deleteTableColumnValue;
									(body.requests as IDataObject[]).push({
										deleteTableColumn: {
											tableCellLocation: {
												rowIndex,
												columnIndex,
												tableStartLocation: {
													segmentId,
													index,
												},
											},
										},
									});
								});
							}
							// handle create header request
							if (!isEmpty(createHeaderValues)) {
								(createHeaderValues as IDataObject[]).forEach(createHeaderValue => {
									const { type, segmentId, index } = createHeaderValue;
									(body.requests as IDataObject[]).push({
										createHeader: {
											type,
											sectionBreakLocation: {
												segmentId,
												index: parseInt(index as string, 10),
											},
										},
									});
								});
							}
							// handle create footer request
							if (!isEmpty(createFooterValues)) {
								(createFooterValues as IDataObject[]).forEach(createFooterValue => {
									const { type, segmentId, index } = createFooterValue;
									(body.requests as IDataObject[]).push({
										createFooter: {
											type,
											sectionBreakLocation: {
												segmentId,
												index: parseInt(index as string, 10),
											},
										},
									});
								});
							}
							// handle delete header request
							if (!isEmpty(deleteHeaderValues)) {
								(deleteHeaderValues as IDataObject[]).forEach(deleteHeaderValue => {
									const { headerId } = deleteHeaderValue;
									(body.requests as IDataObject[]).push({
										deleteHeader: {
											headerId,
										},
									});
								});
							}
							// handle delete footer request
							if (!isEmpty(deleteFooterValues)) {
								(deleteFooterValues as IDataObject[]).forEach(deleteFooterValue => {
									const { footerId } = deleteFooterValue;
									(body.requests as IDataObject[]).push({
										deleteFooter: {
											footerId,
										},
									});
								});
							}
						}

						responseData = await googleApiRequest.call(
							this,
							'POST',
							`/documents/${documentId}:batchUpdate`,
							body,
							qs,
						);

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
