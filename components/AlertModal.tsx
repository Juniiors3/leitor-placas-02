import React from 'react';
import { WatchlistPlate } from '../types';

interface AlertModalProps {
  match: WatchlistPlate | null;
  scannedPlate: string;
  onDismiss: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({ match, scannedPlate, onDismiss }) => {
  if (!match) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-pulse-fast backdrop-blur-sm p-4">
      <div className="bg-hud-dark border-2 border-hud-alert w-full max-w-md p-6 rounded-lg shadow-[0_0_50px_rgba(255,0,51,0.5)] text-center relative overflow-hidden">
        
        {/* Background Stripes */}
        <div className="absolute inset-0 opacity-10" 
             style={{backgroundImage: 'repeating-linear-gradient(45deg, #ff0033 0, #ff0033 10px, transparent 10px, transparent 20px)'}}>
        </div>

        <div className="relative z-10">
          <div className="text-hud-alert font-black text-6xl mb-2 tracking-tighter">ALERTA</div>
          <div className="text-white text-xl font-bold uppercase mb-6 tracking-widest">Veículo Localizado</div>
          
          <div className="bg-black/50 p-4 rounded border border-hud-alert/30 mb-6">
            <div className="text-gray-400 text-xs uppercase mb-1">Placa Detectada</div>
            <div className="text-5xl font-mono text-white font-bold">{scannedPlate}</div>
          </div>

          <div className="text-left mb-8 bg-hud-alert/10 p-3 rounded border-l-4 border-hud-alert">
            <div className="text-hud-alert font-bold text-sm uppercase">Motivo do Monitoramento:</div>
            <div className="text-white text-lg">{match.description}</div>
          </div>

          <button 
            onClick={onDismiss}
            className="w-full bg-hud-alert hover:bg-red-600 text-white font-bold py-4 rounded text-xl uppercase tracking-wider shadow-lg transition-transform active:scale-95"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
