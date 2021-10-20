export interface ICommit {
	id: string;
	repository?: string;
	message?: string;
	patch_set?: IPatchSet[];
	author_name?: string;
	author_email?: string;
	timestamp?: Date;
}

export interface IPatchSet {
	path: string;
	type: string;
}

export interface IRef {
	commit: string;
	repository: string;
	previousCommit?: string;
}
