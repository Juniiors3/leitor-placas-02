export interface GeoLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface ScanRecord {
  id?: number;
  plate: string;
  timestamp: number;
  image: string; // Base64
  location?: GeoLocationData;
  isWatchlistMatch: boolean;
  confidence?: number;
}

export interface WatchlistPlate {
  plate: string;
  description: string;
  addedAt: number;
}

export interface DetectionResult {
  plate: string | null;
  confidence: number;
  isBrazilianOrMercosur: boolean;
}

export enum AppTab {
  MAIN = 'MAIN',
  CAMERA = 'CAMERA',
  HISTORY = 'HISTORY',
  WATCHLIST = 'WATCHLIST'
}
