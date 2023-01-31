import { Credit } from "./interfaces/credit";

export interface ICredit extends Partial<Omit<Credit, 'id'>> {
	
}
