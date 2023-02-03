import type { Product } from './interfaces/product';

export type IProduct = Partial<Omit<Product, 'id'>>;
