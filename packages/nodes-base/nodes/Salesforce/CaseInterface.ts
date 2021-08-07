
export interface ICase {
	Type?: string;
	Origin?: string;
	Reason?: string;
	Status?: string;
	OwnerId?: string;
	Subject?: string;
	ParentId?: string;
	Priority?: string;
	AccountId?: string;
	ContactId?: string;
	Description?: string;
	IsEscalated?: boolean;
	SuppliedName?: string;
	SuppliedEmail?: string;
	SuppliedPhone?: string;
	SuppliedCompany?: string;
	RecordTypeId?: string;
}

export interface ICaseComment {
	CommentBody?: string;
	ParentId?: string;
	IsPublished?: boolean;
}
