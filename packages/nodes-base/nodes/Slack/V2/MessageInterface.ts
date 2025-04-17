export interface IAttachment {
	fields: {
		item?: object[];
	};
}

// Used for SendAndWaitMessage
export interface TextBlock {
	type: string;
	text: string;
	emoji?: boolean;
}

export interface SectionBlock {
	type: 'section';
	text: TextBlock;
}

export interface DividerBlock {
	type: 'divider';
}

export interface ButtonElement {
	type: 'button';
	style?: 'primary';
	text: TextBlock;
	url: string;
}

export interface ActionsBlock {
	type: 'actions';
	elements: ButtonElement[];
}

export interface SendAndWaitMessageBody {
	channel: string;
	blocks: Array<DividerBlock | SectionBlock | ActionsBlock>;
}
