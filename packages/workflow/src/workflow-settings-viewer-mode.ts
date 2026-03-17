export type ViewerInputType = 'text' | 'textarea' | 'number' | 'boolean' | 'file';

export interface ViewerInputField {
	key: string;
	label: string;
	type: ViewerInputType;
	required?: boolean;
	placeholder?: string;
	helpText?: string;
	accept?: string;
}

export interface ViewerMode {
	manual?: string;
	inputs?: ViewerInputField[];
}
