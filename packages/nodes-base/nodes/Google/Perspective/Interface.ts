export interface IData {
	comment: IComment;
	requestedAttributes: RequestedAttributes;
}

export interface IComment {
	text?: string;
	type?: string;
}

export interface RequestedAttributes {
	[key: string]: AttributeParameters;
  }
  
export interface AttributeParameters {
	scoreType?: string;
	scoreThreshold?: FloatValue;
}
  
export interface FloatValue {
	value: number;
}
  