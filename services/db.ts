import { ScanRecord, WatchlistPlate } from '../types';

const API_URL = '/api';

export const addToHistory = async (record: ScanRecord) => {
  // History is handled by the server in process-frame for matches
  // But we can still have a dedicated endpoint if needed
  return null;
};

export const getHistory = async (limit = 50) => {
  const response = await fetch(`${API_URL}/history`);
  return await response.json();
};

export const addToWatchlist = async (plate: string, description: string) => {
  const cleanPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const response = await fetch(`${API_URL}/watchlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plate: cleanPlate, description })
  });
  return await response.json();
};

export const removeFromWatchlist = async (plate: string) => {
  const response = await fetch(`${API_URL}/watchlist/${plate}`, {
    method: 'DELETE'
  });
  return await response.json();
};

export const getWatchlist = async () => {
  const response = await fetch(`${API_URL}/watchlist`);
  return await response.json();
};

export const checkWatchlist = async (plate: string): Promise<WatchlistPlate | undefined> => {
  // Server-side check is done in process-frame
  return undefined;
};

export const processFrame = async (image: string, location?: any) => {
  const response = await fetch(`${API_URL}/process-frame`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, location })
  });
  return await response.json();
};
