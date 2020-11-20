export interface IData {
	document: IDocument;
	encodingType: string;
}

export interface IDocument {
	type: string;
	language?: string;
	content?: string;
	gcsContentUri?: string;
}