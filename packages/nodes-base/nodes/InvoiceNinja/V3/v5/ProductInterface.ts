import { Product } from "./interfaces/product";

export interface IProduct extends Partial<Omit<Product, 'id'>> {
	
}
