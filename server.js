require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'soilguard-default-secret';

// SQLite database
const DB_FILE = path.join(__dirname, 'soilguard_feedback.db');
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('SQLite open error:', err);
    process.exit(1);
  }
  console.log('SQLite database connected at', DB_FILE);
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product TEXT,
      productName TEXT,
      name TEXT,
      role TEXT,
      location TEXT,
      ratings TEXT,
      satisfaction TEXT,
      suggestions TEXT,
      recommend TEXT,
      lang TEXT,
      timestamp TEXT,
      userId INTEGER,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  db.run('PRAGMA foreign_keys = ON');

  db.run('ALTER TABLE feedback ADD COLUMN userId INTEGER', (err) => {
    if (err && !/duplicate column/i.test(err.message)) {
      console.warn('SQLite alter table userId:', err.message);
    }
  });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Auth utilities
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

function optionalAuthenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // ignore invalid token for optional auth
    }
  }
  next();
}

// Register
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username & password required' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = new Date().toISOString();

  const stmt = db.prepare('INSERT INTO users (username, passwordHash, createdAt) VALUES (?, ?, ?)');
  stmt.run(username, passwordHash, createdAt, function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ success: false, message: 'Username exists' });
      }
      console.error('SQLite user insert error:', err);
      return res.status(500).json({ success: false, message: 'Registration failed' });
    }
    res.json({ success: true, userId: this.lastID });
  });
  stmt.finalize();
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username & password required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('SQLite user query error:', err);
      return res.status(500).json({ success: false, message: 'Login failed' });
    }

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token });
  });
});

// API endpoint for feedback
app.post('/api/feedback', optionalAuthenticate, async (req, res) => {
  try {
    const data = req.body;
    const userId = req.user?.userId || null;

    // Save to SQLite
    const stmt = db.prepare(`
      INSERT INTO feedback
        (product, productName, name, role, location, ratings, satisfaction, suggestions, recommend, lang, timestamp, userId)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.product,
      data.productName,
      data.name,
      data.role,
      data.location,
      JSON.stringify(data.ratings || {}),
      data.satisfaction,
      data.suggestions,
      data.recommend,
      data.lang,
      data.timestamp,
      userId,
      function (err) {
        if (err) {
          console.error('SQLite insert error:', err);
        }
      }
    );
    stmt.finalize();

    // Format email
    const emailContent = `
SoilGuard Feedback Submission

Product: ${data.productName} (${data.product})
Timestamp: ${data.timestamp}

User Information:
- Name: ${data.name}
- Role: ${data.role}
- Location: ${data.location}

Ratings:
${Object.entries(data.ratings || {}).map(([key, value]) => `- ${key}: ${value} stars`).join('\n')}

Satisfaction: ${data.satisfaction}
Suggestions: ${data.suggestions}

Recommendation: ${data.recommend}

Language: ${data.lang}
`;

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: `SoilGuard Feedback: ${data.productName} - ${data.name}`,
      text: emailContent
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.warn('Email send warning:', err.message);
      }
    });

    // Send to SheetDB (exact format)
    try {
      const sheetResponse = await fetch("https://sheetdb.io/api/v1/jc0qcjv75l2k5", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          data: [
            {
              name: data.name,
              location: data.location,
              role: data.role,
              product: data.productName,
              rating: data.ratings ? Object.entries(data.ratings).map(([k, v]) => `${k}: ${v}`).join(", ") : "Not rated",
              feedback: data.suggestions,
              recommendation: data.recommend,
              timestamp: new Date().toLocaleString()
            }
          ]
        })
      });
      if (!sheetResponse.ok) {
        console.warn('SheetDB response:', sheetResponse.status);
      }
    } catch (sheetErr) {
      console.warn('SheetDB send warning:', sheetErr.message);
    }

    res.json({
      success: true,
      message: 'Feedback stored and (attempted) emailed successfully',
      reportUrl: `${req.protocol}://${req.get('host')}/api/feedbacks`
    });
  } catch (error) {
    console.error('Error in /api/feedback:', error);
    res.status(500).json({ success: false, message: 'Failed to store feedback' });
  }
});

// Get all feedback entries (secure, with paging + filters)
app.get('/api/feedbacks', authenticate, (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(Math.min(parseInt(req.query.limit, 10) || 20, 100), 1);
  const offset = (page - 1) * limit;

  const { role, product, fromDate, toDate } = req.query;
  const filters = [];
  const params = [];

  if (role) {
    filters.push('role = ?');
    params.push(role);
  }
  if (product) {
    filters.push('product = ?');
    params.push(product);
  }
  if (fromDate) {
    filters.push('timestamp >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    filters.push('timestamp <= ?');
    params.push(toDate);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  db.get(`SELECT COUNT(*) as total FROM feedback ${whereClause}`, params, (countErr, countRow) => {
    if (countErr) {
      console.error('SQLite count error:', countErr);
      return res.status(500).json({ success: false, message: 'Failed to fetch feedback count' });
    }

    const sql = `SELECT * FROM feedback ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
    db.all(sql, [...params, limit, offset], (err, rows) => {
      if (err) {
        console.error('SQLite query error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch feedback' });
      }
      const output = rows.map((row) => ({
        ...row,
        ratings: JSON.parse(row.ratings || '{}')
      }));
      res.json({
        success: true,
        page,
        limit,
        total: countRow.total,
        totalPages: Math.ceil(countRow.total / limit),
        data: output
      });
    });
  });
});

// Get feedback from SheetDB
app.get('/api/sheetdb-data', authenticate, async (req, res) => {
  try {
    const response = await fetch('https://sheetdb.io/api/v1/jc0qcjv75l2k5');
    if (!response.ok) {
      throw new Error(`SheetDB error: ${response.status}`);
    }
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    console.error('SheetDB fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch from SheetDB' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});