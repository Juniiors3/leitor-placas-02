import Dexie, { Table } from 'dexie';
import { ScanRecord, WatchlistPlate } from '../types';

class SentinelDatabase extends Dexie {
  scans!: Table<ScanRecord, number>;
  watchlist!: Table<WatchlistPlate, string>;

  constructor() {
    super('SentinelDB');
    (this as any).version(1).stores({
      scans: '++id, plate, timestamp, isWatchlistMatch',
      watchlist: 'plate, addedAt'
    });
  }
}

export const db = new SentinelDatabase();

export const addToHistory = async (record: ScanRecord) => {
  return await db.scans.add(record);
};

export const getHistory = async (limit = 50) => {
  return await db.scans.orderBy('timestamp').reverse().limit(limit).toArray();
};

export const addToWatchlist = async (plate: string, description: string) => {
  const cleanPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return await db.watchlist.put({
    plate: cleanPlate,
    description,
    addedAt: Date.now()
  });
};

export const removeFromWatchlist = async (plate: string) => {
  return await db.watchlist.delete(plate);
};

export const getWatchlist = async () => {
  return await db.watchlist.toArray();
};

export const checkWatchlist = async (plate: string): Promise<WatchlistPlate | undefined> => {
  const cleanPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return await db.watchlist.get(cleanPlate);
};
