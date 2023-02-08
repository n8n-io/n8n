import type { Product } from './interfaces/product';

export type IProduct = Partial<Omit<Product, 'id' | 'user_id' | 'entity_type'>>;
