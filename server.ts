import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs-extra";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, "db.json");

// Initial DB structure
const initialDb = {
  watchlist: [
    { plate: "ABC1234", description: "Veículo Roubado", addedAt: Date.now() },
    { plate: "XYZ9876", description: "Suspeito de Assalto", addedAt: Date.now() }
  ],
  history: []
};

async function ensureDb() {
  if (!(await fs.pathExists(DB_FILE))) {
    await fs.writeJson(DB_FILE, initialDb, { spaces: 2 });
  }
}

async function startServer() {
  await ensureDb();
  
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // API: Get Watchlist
  app.get("/api/watchlist", async (req, res) => {
    const db = await fs.readJson(DB_FILE);
    res.json(db.watchlist);
  });

  // API: Add to Watchlist
  app.post("/api/watchlist", async (req, res) => {
    const { plate, description } = req.body;
    const db = await fs.readJson(DB_FILE);
    const newEntry = { plate: plate.toUpperCase(), description, addedAt: Date.now() };
    db.watchlist.push(newEntry);
    await fs.writeJson(DB_FILE, db, { spaces: 2 });
    res.json(newEntry);
  });

  // API: Remove from Watchlist
  app.delete("/api/watchlist/:plate", async (req, res) => {
    const { plate } = req.params;
    const db = await fs.readJson(DB_FILE);
    db.watchlist = db.watchlist.filter((item: any) => item.plate !== plate);
    await fs.writeJson(DB_FILE, db, { spaces: 2 });
    res.json({ success: true });
  });

  // API: Get History
  app.get("/api/history", async (req, res) => {
    const db = await fs.readJson(DB_FILE);
    res.json(db.history);
  });

  // API: Process Frame (Fast Comparison)
  app.post("/api/process-frame", async (req, res) => {
    const { image, location } = req.body;
    const db = await fs.readJson(DB_FILE);
    
    // SIMULATION: Fast comparison logic
    // In a real app, we would run OCR here.
    // For "speed" and "no AI", we simulate a 100ms processing time
    // and a 10% chance of "detecting" a plate from the watchlist if it's there.
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing speed

    const hasWatchlist = db.watchlist.length > 0;
    const shouldDetect = hasWatchlist && Math.random() > 0.85; // 15% chance
    
    let result = { plate: null, match: null };

    if (shouldDetect) {
      const match = db.watchlist[Math.floor(Math.random() * db.watchlist.length)];
      result = { plate: match.plate, match: match };
      
      // Save to History
      const historyEntry = {
        id: Date.now(),
        plate: match.plate,
        timestamp: Date.now(),
        image: image,
        location: location,
        isWatchlistMatch: true,
        confidence: 1.0
      };
      db.history.unshift(historyEntry);
      if (db.history.length > 50) db.history.pop(); // Keep history manageable
      await fs.writeJson(DB_FILE, db, { spaces: 2 });
    }

    res.json(result);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
