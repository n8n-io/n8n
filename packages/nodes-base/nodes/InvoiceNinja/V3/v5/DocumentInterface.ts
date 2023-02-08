import { Document } from './interfaces/document.interface';

export type IDocument = Partial<Omit<Document, 'id' | 'entity_type'>>;
