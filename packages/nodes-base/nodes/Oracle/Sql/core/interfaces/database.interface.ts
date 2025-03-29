export interface DatabaseConnection<T> {
	getConnection: () => Promise<T>;
}
