import { IDataObject } from "n8n-workflow";

export interface IUpdateFields {
	writeControl: {
		writeControlObject: {
			control: string,
			value: string,
		}
	};
	requestsUi: {
		createFooterValues: Array<{
			type: 'DEFAULT' | 'HEADER_FOOTER_TYPE_UNSPECIFIED',
			segmentId: string,
			index: number,
		}>;
		createHeaderValues: Array<{
			type: 'DEFAULT' | 'HEADER_FOOTER_TYPE_UNSPECIFIED',
			segmentId: string,
			index: number,
		}>;
		createNamedRangeValues: Array<{
			name: string,
			segmentId: string,
			startIndex: number,
			endIndex: number,
		}>;
		createParagraphBulletsValues: Array<{
			bulletPreset: string,
			segmentId: string,
			startIndex: number,
			endIndex: number,
		}>;
		deleteFooterValues: Array<{
			footerId: string,
		}>;
		deleteHeaderValues: Array<{
			headerId: string,
		}>;
		deleteNamedRangeValues: Array<{
			namedRangeReference: 'name' | 'namedRangeId',
			value: string,
		}>;
		deleteParagraphBulletsValues: Array<{
			startIndex: number,
			segmentId: string,
			endIndex: number,
		}>;
		deletePositionedObjectValues: Array<{
			objectId: string,
		}>;
		deleteTableColumnValues: Array<{
			rowIndex: number,
			columnIndex: number,
			segmentId: string,
			index: number,
		}>;
		deleteTableRowValues: Array<{
			rowIndex: number,
			columnIndex: number,
			segmentId: string,
			index: number,
		}>;
		insertPageBreakValues: Array<{
			locationChoice: 'endOfSegmentLocation' | 'location',
			segmentId: string,
			index: number,
		}>;
		insertTableValues: Array<{
			rows: number,
			columns: number,
			locationChoice: 'endOfSegmentLocation' | 'location',
			segmentId: string,
			index: number,
		}>;
		insertTableColumnValues: Array<{
			insertRight: boolean,
			rowIndex: number,
			columnIndex: number,
			segmentId: string,
			index: number,
		}>;
		insertTableRowValues: Array<{
			insertBelow: boolean,
			rowIndex: number,
			columnIndex: number,
			segmentId: string,
			index: number,
		}>;
		insertTextValues: Array<{
			text: string,
			locationChoice: 'endOfSegmentLocation' | 'location',
			segmentId: string,
			index: number,
		}>;
		replaceAllTextValues: Array<{
			replaceText: string,
			text: string,
			matchCase: boolean,
		}>;
	}
}

export interface IUpdateBody extends IDataObject {
	requests: IDataObject[];
	writeControl?: { [key: string]: string };
}
