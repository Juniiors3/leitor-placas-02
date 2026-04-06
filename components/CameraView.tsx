import React, { useRef, useEffect, useState } from 'react';

interface CameraViewProps {
  isActive: boolean;
  onFrameCapture: (imageData: string) => void;
  intervalMs: number;
}

export const CameraView: React.FC<CameraViewProps> = ({ isActive, onFrameCapture, intervalMs }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // High res for capture
  const motionCanvasRef = useRef<HTMLCanvasElement>(null); // Low res for motion detection
  const streamRef = useRef<MediaStream | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [motionScore, setMotionScore] = useState<number>(0);
  
  // State refs to access inside intervals without re-binding
  const lastCaptureTimeRef = useRef<number>(0);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);

  // Constants for Motion Detection
  const MOTION_CHECK_INTERVAL = 100; // Check for motion every 100ms
  const MOTION_THRESHOLD = 15; // Sensitivity (pixels changed)
  const ROI_SIZE = 64; // Low res grid for motion check (64x64)

  // Start Camera
  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!isMounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera Access Error:", err);
        if (isMounted) {
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                if (!isMounted) {
                    fallbackStream.getTracks().forEach(track => track.stop());
                    return;
                }
                streamRef.current = fallbackStream;
                setStream(fallbackStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = fallbackStream;
                }
            } catch (fallbackErr) {
                console.error("Fallback Camera Error:", fallbackErr);
                setError("Não foi possível acessar a câmera. Verifique permissões.");
            }
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Motion Detection & Capture Loop
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (isActive && stream && videoRef.current && canvasRef.current) {
      // Create a small offscreen canvas for motion logic if it doesn't exist in DOM
      if (!motionCanvasRef.current) {
        motionCanvasRef.current = document.createElement('canvas');
        motionCanvasRef.current.width = ROI_SIZE;
        motionCanvasRef.current.height = ROI_SIZE;
      }

      intervalId = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const motionCanvas = motionCanvasRef.current;

        if (!video || !canvas || !motionCanvas || video.readyState !== 4) return;

        // 1. MOTION DETECTION LOGIC
        const mCtx = motionCanvas.getContext('2d', { willReadFrequently: true });
        if (!mCtx) return;

        // Define Region of Interest (ROI) - Center of the video
        // We only check motion in the "box" where the plate should be
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        
        // Approx center coordinates based on the UI box (roughly 50% width, 20% height of screen)
        // We take a center crop
        const roiW = vw * 0.6;
        const roiH = vh * 0.3;
        const roiX = (vw - roiW) / 2;
        const roiY = (vh - roiH) / 2;

        // Draw the ROI to the small motion canvas
        mCtx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, ROI_SIZE, ROI_SIZE);
        
        const frameData = mCtx.getImageData(0, 0, ROI_SIZE, ROI_SIZE).data;
        let score = 0;

        if (prevFrameDataRef.current) {
          const prev = prevFrameDataRef.current;
          let diffCount = 0;
          
          // Simple pixel diff algorithm (step by 4 for RGBA)
          for (let i = 0; i < frameData.length; i += 4) {
            // Convert to grayscale for comparison: 0.299R + 0.587G + 0.114B
            const grayCurrent = (frameData[i] * 0.299) + (frameData[i + 1] * 0.587) + (frameData[i + 2] * 0.114);
            const grayPrev = (prev[i] * 0.299) + (prev[i + 1] * 0.587) + (prev[i + 2] * 0.114);

            if (Math.abs(grayCurrent - grayPrev) > 30) { // Individual pixel noise threshold
              diffCount++;
            }
          }
          // Calculate percentage of change
          score = (diffCount / (ROI_SIZE * ROI_SIZE)) * 100;
        }

        // Store current frame for next comparison
        // We need to copy the Float32Array/Uint8ClampedArray otherwise it refs the buffer
        prevFrameDataRef.current = new Uint8ClampedArray(frameData);
        setMotionScore(score);

        // 2. CAPTURE LOGIC
        const now = Date.now();
        const timeSinceLastCapture = now - lastCaptureTimeRef.current;

        // Trigger capture IF:
        // A) Motion score exceeds threshold (something moved in the box)
        // B) Enough time has passed since last API call (Throttling)
        if (score > MOTION_THRESHOLD && timeSinceLastCapture > intervalMs) {
           
           // Visual Flash effect logic could go here

           const context = canvas.getContext('2d');
           if (context) {
             canvas.width = vw;
             canvas.height = vh;
             context.drawImage(video, 0, 0, vw, vh);
             
             // Convert to JPEG
             const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
             
             lastCaptureTimeRef.current = now; // Reset timer
             onFrameCapture(dataUrl);
           }
        }

      }, MOTION_CHECK_INTERVAL);
    }

    return () => clearInterval(intervalId);
  }, [isActive, stream, intervalMs, onFrameCapture]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-hud-black text-hud-alert p-4 text-center border border-hud-alert/30 m-4 rounded">
        <div className="max-w-xs">
            <p className="font-bold mb-2">Erro de Câmera</p>
            <p className="text-sm opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  const isMotionDetected = motionScore > 15;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Hidden Canvases */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Live Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
        
        {/* Viewfinder Box */}
        <div className={`
            relative w-72 h-32 border-2 rounded-lg transition-all duration-200
            ${isMotionDetected 
                ? 'border-hud-primary shadow-[0_0_25px_rgba(0,255,65,0.6)] bg-hud-primary/10' 
                : 'border-hud-primary/30 bg-hud-primary/0'}
        `}>
            {isActive && (
                 <div className={`absolute top-0 left-0 w-full h-1 bg-hud-primary/80 shadow-[0_0_10px_#00ff41] animate-scan-line ${isMotionDetected ? 'opacity-100' : 'opacity-30'}`} />
            )}
            
            {/* Corner Markers */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-hud-primary"></div>
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-hud-primary"></div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-hud-primary"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-hud-primary"></div>

            {/* Center Crosshair */}
            <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-hud-primary/50 -translate-x-1/2"></div>
            <div className="absolute top-1/2 left-1/2 h-4 w-0.5 bg-hud-primary/50 -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        {/* Status Text */}
        <div className="mt-6 flex flex-col items-center gap-1">
            <div className="text-hud-primary font-mono text-xs tracking-widest uppercase bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-hud-gray">
                {isActive ? (isMotionDetected ? "MOVIMENTO DETECTADO - ANALISANDO" : "AGUARDANDO VEÍCULO...") : "SISTEMA PAUSADO"}
            </div>
            
            {/* Motion Meter */}
            {isActive && (
                <div className="w-32 h-1 bg-gray-800 rounded-full overflow-hidden mt-1">
                    <div 
                        className="h-full bg-hud-primary transition-all duration-100 ease-out"
                        style={{ width: `${Math.min(motionScore * 4, 100)}%` }}
                    />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};