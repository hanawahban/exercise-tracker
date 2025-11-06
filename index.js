const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

// Middleware
app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.urlencoded({ extended: false })); // parse form posts
app.use(express.json()); // (not required by FCC tests, but handy)
app.use(express.static('public'));

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

/* ===============================
   In-memory data store
   =============================== */
const users = new Map(); // id -> { _id, username }
const logs = new Map();  // id -> [ { description, duration:Number, date: Date } ]

// Simple id generator (24 hex chars)
function genId() {
  return Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// Helpers
function toDateOrNow(dateStr) {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}
function parseYyyyMmDd(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/* ===============================
   Routes required by FCC
   =============================== */

// 2/3) Create user
app.post('/api/users', (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username required' });

  const _id = genId();
  const user = { _id, username: String(username) };
  users.set(_id, user);
  logs.set(_id, []);
  res.json(user);
});

// 4/5/6) List users
app.get('/api/users', (req, res) => {
  res.json(Array.from(users.values()));
});

// 7/8) Add exercise
app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  const user = users.get(_id);
  if (!user) return res.status(404).json({ error: 'user not found' });

  const { description, duration, date } = req.body || {};

  if (!description || !duration) {
    return res.status(400).json({ error: 'description and duration required' });
  }

  const durationNum = Number(duration);
  if (!Number.isFinite(durationNum)) {
    return res.status(400).json({ error: 'duration must be a number' });
  }

  const when = toDateOrNow(date);

  const entry = {
    description: String(description),
    duration: durationNum,
    date: when, // keep as Date internally
  };

  logs.get(_id).push(entry);

  res.json({
    _id: user._id,
    username: user.username,
    description: entry.description,
    duration: entry.duration,
    date: entry.date.toDateString(),
  });
});

// 9–16) Get user logs (with from, to, limit)
app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  const user = users.get(_id);
  if (!user) return res.status(404).json({ error: 'user not found' });

  const { from, to, limit } = req.query;
  const fromDate = parseYyyyMmDd(from);
  const toDate = parseYyyyMmDd(to);
  const lim = Number.isFinite(Number(limit)) ? Number(limit) : null;

  let entries = logs.get(_id) || [];

  // Filter by date range (inclusive)
  if (fromDate) {
    entries = entries.filter(e => e.date >= fromDate);
  }
  if (toDate) {
    entries = entries.filter(e => e.date <= toDate);
  }

  const mapped = entries.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString(),
  }));

  const limited = lim ? mapped.slice(0, lim) : mapped;

  res.json({
    username: user.username,
    _id: user._id,
    count: limited.length,
    log: limited,
  });
});

// Start server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
