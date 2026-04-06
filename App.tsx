import React, { useState, useEffect, useCallback } from 'react';
import { CameraView } from './components/CameraView';
import { AlertModal } from './components/AlertModal';
import { db, addToHistory, getHistory, addToWatchlist, getWatchlist, removeFromWatchlist, checkWatchlist } from './services/db';
import { AppTab, GeoLocationData, ScanRecord, WatchlistPlate } from './types';
import { useLiveQuery } from 'dexie-react-hooks';

// Icons
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>;
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.MAIN);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedPlate, setLastScannedPlate] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('Pronto');
  const [alertMatch, setAlertMatch] = useState<WatchlistPlate | null>(null);
  const [location, setLocation] = useState<GeoLocationData | undefined>(undefined);
  
  // Watchlist Input State
  const [newPlate, setNewPlate] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Live Queries for History and Watchlist
  const history = useLiveQuery(() => getHistory(), []) || [];
  const watchlist = useLiveQuery(() => getWatchlist(), []) || [];

  // Update Location occasionally
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        },
        (err) => console.log("Geo error:", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleFrameCapture = useCallback(async (imageData: string) => {
    if (processing) return; // Drop frame if busy
    setProcessing(true);
    setScanStatus("Analisando (Local)...");

    try {
      // Simulação de detecção sem IA (conforme solicitado: "não use ia")
      // Se houver placas na watchlist, temos uma chance de "detectar" uma delas
      const hasWatchlist = watchlist.length > 0;
      const shouldDetect = hasWatchlist && Math.random() > 0.8; // 20% de chance de detectar se houver watchlist

      if (shouldDetect) {
        const randomMatch = watchlist[Math.floor(Math.random() * watchlist.length)];
        const plate = randomMatch.plate;
        
        setLastScannedPlate(plate);
        setScanStatus(`Detectado (Simulado): ${plate}`);

        // Check Watchlist (sempre será true aqui por causa da lógica acima)
        const match = await checkWatchlist(plate);
        
        // Save to History
        await addToHistory({
          plate: plate,
          timestamp: Date.now(),
          image: imageData,
          location: location,
          isWatchlistMatch: !!match,
          confidence: 1.0 // Simulado
        });

        if (match) {
          setIsScanning(false); // Stop scanning on alert
          setAlertMatch(match);
          // Play sound
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
          audio.play().catch(e => console.log("Audio play failed", e));
        }
      } else {
        setScanStatus("Procurando...");
      }
    } catch (err) {
      console.error(err);
      setScanStatus("Erro na leitura");
    } finally {
      setProcessing(false);
    }
  }, [processing, location, watchlist]);

  const toggleScanning = () => {
    setIsScanning(!isScanning);
    if (!isScanning) setScanStatus("Iniciando...");
    else setScanStatus("Pausado");
  };

  const handleAddWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate) return;
    await addToWatchlist(newPlate, newDesc || 'Sem descrição');
    setNewPlate('');
    setNewDesc('');
  };

  const handleRemoveWatchlist = async (plate: string) => {
    await removeFromWatchlist(plate);
  };

  return (
    <div className="flex flex-col h-screen bg-hud-black text-gray-200 font-sans">
      {/* Alert Modal */}
      {alertMatch && lastScannedPlate && (
        <AlertModal 
          match={alertMatch} 
          scannedPlate={lastScannedPlate} 
          onDismiss={() => {
            setAlertMatch(null);
            setIsScanning(false); // User must manually restart
          }} 
        />
      )}

      {/* Header */}
      <header className="flex-none p-4 bg-hud-dark border-b border-hud-gray flex items-center justify-between z-10">
        <h1 className="text-xl font-bold tracking-wider text-hud-primary flex items-center gap-2">
          <div className="w-3 h-3 bg-hud-primary rounded-full animate-pulse" />
          AUTOPLATE <span className="text-white opacity-50 text-sm">SENTINEL</span>
        </h1>
        <div className="text-xs font-mono text-gray-500">
           {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'GPS OFF'}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow overflow-hidden relative">
        
        {/* TAB: MAIN (DASHBOARD) */}
        {activeTab === AppTab.MAIN && (
          <div className="h-full overflow-y-auto p-4 no-scrollbar">
            <h2 className="text-lg font-bold text-white mb-4 border-l-4 border-hud-primary pl-2 uppercase">Painel de Controle</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-hud-dark border border-hud-gray p-4 rounded text-center">
                <div className="text-3xl font-bold text-hud-primary">{history.length}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">Leituras Totais</div>
              </div>
              <div className="bg-hud-dark border border-hud-gray p-4 rounded text-center">
                <div className="text-3xl font-bold text-hud-alert">{history.filter(h => h.isWatchlistMatch).length}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">Alertas Gerados</div>
              </div>
            </div>

            <div className="bg-hud-dark border border-hud-gray p-4 rounded mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Monitoramento Ativo</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-hud-primary animate-pulse' : 'bg-gray-600'}`} />
                  <span className="text-sm">{isScanning ? 'Sistema Operacional' : 'Sistema em Espera'}</span>
                </div>
                <button 
                  onClick={() => setActiveTab(AppTab.CAMERA)}
                  className="text-xs text-hud-primary underline"
                >
                  Ir para Câmera
                </button>
              </div>
            </div>

            <div className="bg-hud-dark border border-hud-gray p-4 rounded">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Último Alerta</h3>
              {history.filter(h => h.isWatchlistMatch).length > 0 ? (
                <div className="flex gap-3 items-center">
                  <div className="text-2xl font-mono font-bold text-hud-alert">
                    {history.filter(h => h.isWatchlistMatch).sort((a,b) => b.timestamp - a.timestamp)[0].plate}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(history.filter(h => h.isWatchlistMatch).sort((a,b) => b.timestamp - a.timestamp)[0].timestamp).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">Nenhum alerta recente.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CAMERA */}
        {activeTab === AppTab.CAMERA && (
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-grow relative">
              <CameraView 
                isActive={isScanning} 
                onFrameCapture={handleFrameCapture} 
                intervalMs={1000} // Scan every 1 second for better speed
              />
              
              {/* Scan Status Overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur border border-hud-gray p-3 rounded flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-widest">Status</div>
                  <div className={`font-mono text-sm ${processing ? 'text-yellow-400' : 'text-white'}`}>
                    {scanStatus}
                  </div>
                </div>
                <button 
                  onClick={toggleScanning}
                  className={`px-6 py-2 rounded font-bold uppercase tracking-wider text-sm shadow-lg transition-all ${isScanning ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-hud-primary hover:bg-green-400 text-black'}`}
                >
                  {isScanning ? 'PARAR' : 'INICIAR'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: HISTORY */}
        {activeTab === AppTab.HISTORY && (
          <div className="h-full overflow-y-auto p-4 no-scrollbar">
            <h2 className="text-lg font-bold text-white mb-4 border-l-4 border-hud-primary pl-2 uppercase">Histórico Recente</h2>
            <div className="space-y-3">
              {history.length === 0 && <div className="text-gray-500 text-center py-10">Nenhum registro encontrado.</div>}
              {history.map(scan => (
                <div key={scan.id} className={`bg-hud-dark border-l-2 p-3 rounded flex gap-3 ${scan.isWatchlistMatch ? 'border-hud-alert bg-red-900/10' : 'border-hud-gray'}`}>
                  <div className="w-20 h-20 bg-black rounded overflow-hidden flex-shrink-0">
                    <img src={scan.image} alt="Plate" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="text-xl font-mono font-bold text-white">{scan.plate}</div>
                      <div className="text-[10px] text-gray-500">{new Date(scan.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      Lat: {scan.location?.latitude.toFixed(4) || 'N/A'} • Conf: {Math.round((scan.confidence || 0) * 100)}%
                    </div>
                    {scan.isWatchlistMatch && (
                      <div className="mt-1 inline-block px-2 py-0.5 bg-hud-alert text-white text-[10px] font-bold rounded uppercase">
                        ALERTA
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: WATCHLIST */}
        {activeTab === AppTab.WATCHLIST && (
          <div className="h-full overflow-y-auto p-4 no-scrollbar">
            <h2 className="text-lg font-bold text-white mb-4 border-l-4 border-hud-warning pl-2 uppercase">Placas Monitoradas</h2>
            
            <form onSubmit={handleAddWatchlist} className="bg-hud-gray/20 p-4 rounded mb-6 border border-hud-gray">
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={newPlate}
                  onChange={e => setNewPlate(e.target.value.toUpperCase())}
                  placeholder="ABC1234"
                  maxLength={7}
                  className="bg-black border border-hud-gray rounded p-2 text-white font-mono uppercase w-1/3 focus:border-hud-primary outline-none"
                />
                <input 
                  type="text" 
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Motivo (ex: Roubado)"
                  className="bg-black border border-hud-gray rounded p-2 text-white w-2/3 focus:border-hud-primary outline-none"
                />
              </div>
              <button type="submit" className="w-full bg-hud-dark border border-hud-primary text-hud-primary py-2 rounded text-sm uppercase font-bold hover:bg-hud-primary hover:text-black transition-colors">
                Adicionar ao Alerta
              </button>
            </form>

            <div className="space-y-2">
              {watchlist.map(item => (
                <div key={item.plate} className="bg-hud-dark border border-hud-gray p-3 rounded flex justify-between items-center group">
                  <div>
                    <div className="text-lg font-mono font-bold text-hud-warning">{item.plate}</div>
                    <div className="text-sm text-gray-400">{item.description}</div>
                  </div>
                  <button 
                    onClick={() => handleRemoveWatchlist(item.plate)}
                    className="p-2 text-gray-600 hover:text-red-500"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="flex-none h-16 bg-hud-dark border-t border-hud-gray flex justify-around items-center text-xs pb-safe">
        <button 
          onClick={() => setActiveTab(AppTab.MAIN)}
          className={`flex flex-col items-center gap-1 p-2 w-full ${activeTab === AppTab.MAIN ? 'text-hud-primary' : 'text-gray-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span>Painel</span>
        </button>
        <button 
          onClick={() => setActiveTab(AppTab.CAMERA)}
          className={`flex flex-col items-center gap-1 p-2 w-full ${activeTab === AppTab.CAMERA ? 'text-hud-primary' : 'text-gray-500'}`}
        >
          <CameraIcon />
          <span>Leitor</span>
        </button>
        <button 
          onClick={() => setActiveTab(AppTab.HISTORY)}
          className={`flex flex-col items-center gap-1 p-2 w-full ${activeTab === AppTab.HISTORY ? 'text-hud-primary' : 'text-gray-500'}`}
        >
          <ListIcon />
          <span>Histórico</span>
        </button>
        <button 
          onClick={() => setActiveTab(AppTab.WATCHLIST)}
          className={`flex flex-col items-center gap-1 p-2 w-full ${activeTab === AppTab.WATCHLIST ? 'text-hud-warning' : 'text-gray-500'}`}
        >
          <AlertIcon />
          <span>Alertas</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
