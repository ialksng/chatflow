import React, { useRef, useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useCallStore } from '../store/useCallStore';
import { Trash2, Eraser, Pen } from 'lucide-react';

const COLORS = [
  { name: "White", value: "#ffffff" },
  { name: "Blue", value: "#38bdf8" },
  { name: "Green", value: "#34d399" },
  { name: "Yellow", value: "#facc15" },
  { name: "Red", value: "#f43f5e" },
];

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [currentColor, setCurrentColor] = useState("#ffffff");
  const [isEraser, setIsEraser] = useState(false);
  const [brushWidth, setBrushWidth] = useState(4);
  const { socket } = useAuthStore();
  const { remoteUserId } = useCallStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Fixed internal coordinate map: 1000x1000 for equal coordinates across all devices
    canvas.width = 1000;
    canvas.height = 1000;

    if (!socket) return;

    const onReceiveDraw = (data) => {
      const { x0, y0, x1, y1, color, width } = data;
      drawLine(ctx, x0, y0, x1, y1, color, width || 4, false);
    };

    const onReceiveClear = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    socket.on("receive-draw", onReceiveDraw);
    socket.on("clear-whiteboard", onReceiveClear);

    return () => {
      socket.off("receive-draw", onReceiveDraw);
      socket.off("clear-whiteboard", onReceiveClear);
    };
  }, [socket]);

  const drawLine = (ctx, x0, y0, x1, y1, color, width, emit) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.closePath();

    if (!emit || !socket) return;
    socket.emit("draw", {
      to: remoteUserId,
      drawData: { x0, y0, x1, y1, color, width }
    });
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (socket && remoteUserId) {
      socket.emit("clear-whiteboard", { to: remoteUserId });
    }
  };

  // Scaled coordinates: Translate screen pixels to the 1000x1000 map
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    
    return { 
      x: e.nativeEvent.offsetX * scaleX, 
      y: e.nativeEvent.offsetY * scaleY 
    };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    setLastPos(getCoordinates(e));
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext('2d');
    const newPos = getCoordinates(e);
    
    const activeColor = isEraser ? '#0a0a0c' : currentColor;
    const activeWidth = isEraser ? 24 : brushWidth;

    drawLine(ctx, lastPos.x, lastPos.y, newPos.x, newPos.y, activeColor, activeWidth, true);
    setLastPos(newPos);
  };

  const stopDrawing = () => setIsDrawing(false);

  return (
    <div className="w-full h-full bg-base-300 rounded-none sm:rounded-xl overflow-hidden shadow-lg border-0 sm:border border-base-100 flex flex-col">
      <div className="p-2 sm:p-3 bg-base-200 flex items-center justify-between gap-2 border-b border-base-300 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                setCurrentColor(c.value);
                setIsEraser(false);
              }}
              style={{ backgroundColor: c.value }}
              className={`size-6 sm:size-7 rounded-full border-2 transition-transform ${
                !isEraser && currentColor === c.value ? "scale-110 border-primary ring-2 ring-primary/40" : "border-white/30 hover:scale-105"
              }`}
              title={c.name}
            />
          ))}

          <button
            onClick={() => setIsEraser(!isEraser)}
            className={`btn btn-xs sm:btn-sm btn-ghost gap-1 ${isEraser ? "btn-active bg-primary/20 text-primary" : ""}`}
            title="Eraser"
          >
            <Eraser size={16} />
            <span className="hidden sm:inline">Eraser</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="btn btn-xs sm:btn-sm btn-ghost text-error gap-1 hover:bg-error/10"
            title="Clear whiteboard for both users"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>
      
      {/* Container centers the square canvas */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden bg-black/40">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing} 
          onTouchMove={draw}          
          onTouchEnd={stopDrawing}    
          className="bg-[#0a0a0c] shadow-2xl touch-none cursor-crosshair sm:rounded-md border border-base-100"
          style={{
            aspectRatio: '1 / 1',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />
      </div>
    </div>
  );
};

export default Whiteboard;