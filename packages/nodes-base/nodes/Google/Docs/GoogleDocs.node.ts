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
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'document') {
					//https://developers.google.com/docs/api/reference/rest/v1/documents/create
					if (operation === 'create') {
						const title = this.getNodeParameter('title', i) as string;

						const body: IDataObject = {
							title
						};

						responseData = await googleApiRequest.call(
							this,
							'POST',
							`/documents`,
							body,
							qs,
						);

						console.log({operation,responseData});

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

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {
							documentId,
							requests:[],
						};

						if (updateFields.writeControl){
							const writeControl = (updateFields.writeControl as IDataObject).writeControlObject as IDataObject;
							body.writeControl = {
								[writeControl.control as string]:writeControl.value as string
							}
						}

						if (updateFields.requestsUi) {
							const {
								replaceAllTextValues,
								insertTextValues,
								insertPageBreakValues,
								insertTableValues,
								insertTableRowValues,
								insertTableColumnValues,
								createParagraphBulletsValues,
								deleteParagraphBulletsValues,
								createNamedRangeValues,
								deleteNamedRangeValues,
								deletePositionedObjectValues,
								deleteTableRowValues,
								deleteTableColumnValues,
								createHeaderValues,
								createFooterValues,
								deleteHeaderValues,
								deleteFooterValues,
							} = updateFields.requestsUi as IDataObject;

							// handle replace all text request
							if (replaceAllTextValues){
								(replaceAllTextValues as IDataObject[]).forEach( replaceAllTextValue => {
									(body.requests as IDataObject[]).push({
										replaceAllText:{
											replaceText: replaceAllTextValue.replaceText,
											containsText:{
												text: replaceAllTextValue.text,
												matchCase: replaceAllTextValue.matchCase,
											}
										}
									})
								})
							}
							// handle insert text request
							if (insertTextValues){
								(insertTextValues as IDataObject[]).forEach( insertTextValue => {
									(body.requests as IDataObject[]).push({
										insertText:{
											text: insertTextValue.text,
											[insertTextValue.locationChoice as string]:{
												segmentId: insertTextValue.segmentId,
												...(insertTextValue.locationChoice === 'location') ?{
													index: parseInt(insertTextValue.index as string),
												}:{},
											}
										}
									})
								})
							}
							// handle insert age break request
							if (insertPageBreakValues){
								(insertPageBreakValues as IDataObject[]).forEach( insertPageBreakValue => {
									(body.requests as IDataObject[]).push({
										insertPageBreak:{
											[insertPageBreakValue.locationChoice as string]:{
												segmentId: insertPageBreakValue.segmentId,
												...(insertPageBreakValue.locationChoice === 'location') ?{
													index: parseInt(insertPageBreakValue.index as string),
												}:{},
											}
										}
									})
								})
							}
							// handle insert table request
							if (insertTableValues){
								(insertTableValues as IDataObject[]).forEach( insertTableValue => {
									(body.requests as IDataObject[]).push({
										insertTable:{
											rows: insertTableValue.rows,
											columns: insertTableValue.columns,
											[insertTableValue.locationChoice as string]:{
												segmentId: insertTableValue.segmentId,
												...(insertTableValue.locationChoice === 'location') ?{
													index: parseInt(insertTableValue.index as string),
												}:{},
											}
										}
									})
								})
							}
							// handle insert table row request
							if (insertTableRowValues){
								(insertTableRowValues as IDataObject[]).forEach( insertTableRowValue => {
									(body.requests as IDataObject[]).push({
										insertTableRow:{
											insertBelow: insertTableRowValue.insertBelow,
											tableCellLocation: {
												rowIndex: insertTableRowValue.rowIndex,
												columnIndex: insertTableRowValue.columnIndex,
												tableStartLocation: {
													segmentId: insertTableRowValue.segmentId,
													index: insertTableRowValue.index,
												}
											}
										}
									})
								})
							}
							// handle insert table column request
							if (insertTableColumnValues){
								(insertTableColumnValues as IDataObject[]).forEach( insertTableColumnValue => {
									(body.requests as IDataObject[]).push({
										insertTableColumn:{
											insertRight: insertTableColumnValue.insertRight,
											tableCellLocation: {
												rowIndex: insertTableColumnValue.rowIndex,
												columnIndex: insertTableColumnValue.columnIndex,
												tableStartLocation: {
													segmentId: insertTableColumnValue.segmentId,
													index: insertTableColumnValue.index,
												}
											}
										}
									})
								})
							}
							// handle create paragraph bullets request
							if (createParagraphBulletsValues){
								(createParagraphBulletsValues as IDataObject[]).forEach( createParagraphBulletsValue => {
									(body.requests as IDataObject[]).push({
										createParagraphBullets:{
											bulletPreset: createParagraphBulletsValue.bulletPreset,
											range:{
												segmentId: createParagraphBulletsValue.segmentId,
												startIndex: createParagraphBulletsValue.startIndex,
												endIndex: createParagraphBulletsValue.endIndex,
											}
										}
									})
								})
							}
							// handle delete paragraph bullets request
							if (deleteParagraphBulletsValues){
								(deleteParagraphBulletsValues as IDataObject[]).forEach( deleteParagraphBulletsValue => {
									(body.requests as IDataObject[]).push({
										deleteParagraphBullets: {
											range:{
												segmentId: deleteParagraphBulletsValue.segmentId,
												startIndex: deleteParagraphBulletsValue.startIndex,
												endIndex: deleteParagraphBulletsValue.endIndex,
											}
										}
									})
								})
							}
							// handle create name range request
							if (createNamedRangeValues){
								(createNamedRangeValues as IDataObject[]).forEach( createNamedRangeValue => {
									(body.requests as IDataObject[]).push({
										createNamedRange: {
											name: createNamedRangeValue.name,
											range:{
												segmentId: createNamedRangeValue.segmentId,
												startIndex: createNamedRangeValue.startIndex,
												endIndex: createNamedRangeValue.endIndex,
											}
										}
									})
								})
							}
							// handle delete name range request
							if (deleteNamedRangeValues){
								(deleteNamedRangeValues as IDataObject[]).forEach( deleteNamedRangeValue => {
									(body.requests as IDataObject[]).push({
										deleteNamedRange: {
											[deleteNamedRangeValue.namedRangeReference as string]:deleteNamedRangeValue.value ,
										}
									})
								})
							}
							// handle delete positioned object request
							if (deletePositionedObjectValues){
								(deletePositionedObjectValues as IDataObject[]).forEach( deletePositionedObjectValue => {
									(body.requests as IDataObject[]).push({
										deletePositionedObject: {
											objectId:deletePositionedObjectValue.objectId,
										}
									})
								})
							}
							// handle delete table row request
							if (deleteTableRowValues){
								(deleteTableRowValues as IDataObject[]).forEach( deleteTableRowValue => {
									(body.requests as IDataObject[]).push({
										deleteTableRow:{
											tableCellLocation: {
												rowIndex: deleteTableRowValue.rowIndex,
												columnIndex: deleteTableRowValue.columnIndex,
												tableStartLocation: {
													segmentId: deleteTableRowValue.segmentId,
													index: deleteTableRowValue.index,
												}
											}
										}
									})
								})
							}
							// handle delete table column request
							if (deleteTableColumnValues){
								(deleteTableColumnValues as IDataObject[]).forEach( deleteTableColumnValue => {
									(body.requests as IDataObject[]).push({
										deleteTableColumn:{
											tableCellLocation: {
												rowIndex: deleteTableColumnValue.rowIndex,
												columnIndex: deleteTableColumnValue.columnIndex,
												tableStartLocation: {
													segmentId: deleteTableColumnValue.segmentId,
													index: deleteTableColumnValue.index,
												}
											}
										}
									})
								})
							}
							// handle create header request
							if (createHeaderValues){
								(createHeaderValues as IDataObject[]).forEach( createHeaderValue => {
									(body.requests as IDataObject[]).push({
										createHeader: {
											type:createHeaderValue.type,
											sectionBreakLocation:{
												segmentId:createHeaderValue.segmentId,
												index:parseInt(createHeaderValue.index as string),
											}
										}
									})
								})
							}
							// handle create footer request
							if (createFooterValues){
								(createFooterValues as IDataObject[]).forEach( createFooterValue => {
									(body.requests as IDataObject[]).push({
										createFooter: {
											type:createFooterValue.type,
											sectionBreakLocation:{
												segmentId:createFooterValue.segmentId,
												index:parseInt(createFooterValue.index as string),
											}
										}
									})
								})
							}
							// handle delete header request
							if (deleteHeaderValues){
								(deleteHeaderValues as IDataObject[]).forEach( deleteHeaderValue => {
									(body.requests as IDataObject[]).push({
										deleteHeader: {
											headerId:deleteHeaderValue.headerId,
										}
									})
								})
							}
							// handle delete footer request
							if (deleteFooterValues){
								(deleteFooterValues as IDataObject[]).forEach( deleteFooterValue => {
									(body.requests as IDataObject[]).push({
										deleteFooter: {
											footerId:deleteFooterValue.footerId,
										}
									})
								})
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
