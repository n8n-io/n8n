import type { IDataObject } from 'n8n-workflow';

export interface IImage {
	url: string;
}

export interface IChoice {
	position: number;
	visible: boolean;
	text: string;
	id: string;
	weight: number;
	description: string;
	image?: IImage;
}

export interface IRow {
	position: number;
	visible: boolean;
	text: string;
	id: string;
}

export interface IOther {
	text: string;
	visible: boolean;
	is_answer_choice: boolean;
	id: string;
}

export interface IQuestion {
	id: string;
	family?: string;
	subtype?: string;
	headings?: IDataObject[];
	answers: IDataObject;
	rows?: IDataObject;
}

export interface IAnswer {
	choice_id: string;
	row_id?: string;
	text?: string;
	other_id?: string;
}
