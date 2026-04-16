import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { promises as fs } from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? '*';
const JWT_SECRET = process.env.JWT_SECRET ?? 'replace-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const CERT_PATH = path.join(__dirname, '..', 'localhost.pem');
const KEY_PATH = path.join(__dirname, '..', 'localhost-key.pem');

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN }));
app.use(express.json());

if (JWT_SECRET === 'replace-this-in-production') {
  console.warn(
    'Warning: using default JWT secret. Set JWT_SECRET in your .env file.',
  );
}

let writeQueue = Promise.resolve();

async function ensureDb() {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(
      DB_PATH,
      JSON.stringify({ users: [], notes: [] }, null, 2),
    );
  }
}

async function readDb() {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

async function writeDb(db) {
  const tmpPath = `${DB_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(db, null, 2));
  await fs.rename(tmpPath, DB_PATH);
}

function queueWrite(updater) {
  writeQueue = writeQueue.then(async () => {
    const db = await readDb();
    const nextDb = (await updater(db)) ?? db;
    await writeDb(nextDb);
    return nextDb;
  });

  return writeQueue;
}

function normalizeEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function createToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function authRequired(req, res, next) {
  const auth = req.headers.authorization ?? '';
  const [scheme, token] = auth.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing bearer token' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = String(payload.sub);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? '');

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 6 characters' });
    }

    const db = await readDb();
    const exists = db.users.some((u) => u.email === email);
    if (exists) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: randomUUID(),
      email,
      passwordHash,
      createdAt: now,
    };

    await queueWrite((current) => {
      current.users.push(user);
      return current;
    });

    const token = createToken(user);
    return res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to register' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? '');

    const db = await readDb();
    const user = db.users.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = createToken(user);
    return res.json({ token, user: publicUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to login' });
  }
});

app.get('/api/notes', authRequired, async (req, res) => {
  try {
    const db = await readDb();
    const notes = db.notes
      .filter((note) => note.userId === req.userId)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

    return res.json({ notes });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch notes' });
  }
});

app.get('/api/notes/:id', authRequired, async (req, res) => {
  try {
    const noteId = String(req.params.id);
    const db = await readDb();
    const note = db.notes.find(
      (n) => n.id === noteId && n.userId === req.userId,
    );

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    return res.json({ note });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch note' });
  }
});

app.post('/api/notes', authRequired, async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim();
    const content = String(req.body?.content ?? '').trim();

    if (!title && !content) {
      return res
        .status(400)
        .json({ message: 'Note title or content is required' });
    }

    const now = new Date().toISOString();
    const note = {
      id: randomUUID(),
      userId: req.userId,
      title,
      content,
      createdAt: now,
      updatedAt: now,
    };

    await queueWrite((db) => {
      db.notes.push(note);
      return db;
    });

    return res.status(201).json({ note });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to create note' });
  }
});

app.put('/api/notes/:id', authRequired, async (req, res) => {
  try {
    const noteId = String(req.params.id);
    const title = req.body?.title;
    const content = req.body?.content;

    if (title == null && content == null) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    let updated;
    await queueWrite((db) => {
      const note = db.notes.find(
        (n) => n.id === noteId && n.userId === req.userId,
      );
      if (!note) {
        return db;
      }

      if (title != null) {
        note.title = String(title).trim();
      }

      if (content != null) {
        note.content = String(content).trim();
      }

      note.updatedAt = new Date().toISOString();
      updated = note;
      return db;
    });

    if (!updated) {
      return res.status(404).json({ message: 'Note not found' });
    }

    return res.json({ note: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to update note' });
  }
});

app.delete('/api/notes/:id', authRequired, async (req, res) => {
  try {
    const noteId = String(req.params.id);

    let deleted = false;
    await queueWrite((db) => {
      const initialCount = db.notes.length;
      db.notes = db.notes.filter(
        (n) => !(n.id === noteId && n.userId === req.userId),
      );
      deleted = db.notes.length !== initialCount;
      return db;
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Note not found' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to delete note' });
  }
});

await ensureDb();

// Start HTTPS server
const cert = await fs.readFile(CERT_PATH);
const key = await fs.readFile(KEY_PATH);
https.createServer({ cert, key }, app).listen(PORT, () => {
  console.log(`API running on https://localhost:${PORT}`);
});
