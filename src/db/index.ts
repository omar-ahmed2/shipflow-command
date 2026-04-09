import { generateId, now } from './helpers';

type TableName = 'users' | 'couriers' | 'shipments' | 'shipmentEvents' | 'notifications';

class LocalDB {
  private getTable<T>(name: TableName): T[] {
    const data = localStorage.getItem(`shipflow_${name}`);
    return data ? JSON.parse(data) : [];
  }

  private setTable<T>(name: TableName, data: T[]): void {
    localStorage.setItem(`shipflow_${name}`, JSON.stringify(data));
  }

  // Generic CRUD
  getAll<T>(table: TableName): T[] {
    return this.getTable<T>(table);
  }

  getById<T extends { id: string }>(table: TableName, id: string): T | undefined {
    return this.getTable<T>(table).find(item => item.id === id);
  }

  query<T>(table: TableName, predicate: (item: T) => boolean): T[] {
    return this.getTable<T>(table).filter(predicate);
  }

  create<T extends { id?: string }>(table: TableName, item: T, prefix: string): T & { id: string } {
    const items = this.getTable<T>(table);
    const newItem = {
      ...item,
      id: item.id || generateId(prefix),
      createdAt: now(),
      updatedAt: now(),
    } as T & { id: string };
    items.push(newItem);
    this.setTable(table, items);
    return newItem;
  }

  update(table: TableName, id: string, updates: Record<string, any>): any {
    const items = this.getTable<any>(table);
    const index = items.findIndex((item: any) => item.id === id);
    if (index === -1) return undefined;
    items[index] = { ...items[index], ...updates, updatedAt: now() };
    this.setTable(table, items);
    return items[index];
  }

  delete(table: TableName, id: string): boolean {
    const items = this.getTable<any>(table);
    const filtered = items.filter((item: any) => item.id !== id);
    if (filtered.length === items.length) return false;
    this.setTable(table, filtered);
    return true;
  }

  count(table: TableName, predicate?: (item: any) => boolean): number {
    const items = this.getTable<any>(table);
    return predicate ? items.filter(predicate).length : items.length;
  }

  isInitialized(): boolean {
    return localStorage.getItem('shipflow_initialized') === 'true';
  }

  setInitialized(): void {
    localStorage.setItem('shipflow_initialized', 'true');
  }

  clearAll(): void {
    const tables: TableName[] = ['users', 'couriers', 'shipments', 'shipmentEvents', 'notifications'];
    tables.forEach(t => localStorage.removeItem(`shipflow_${t}`));
    localStorage.removeItem('shipflow_initialized');
  }
}

export const db = new LocalDB();
