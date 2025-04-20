const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

const db = new sqlite3.Database('./db.sqlite');

// Настройка WebSocket
const wss = new WebSocket.Server({ port: 3001 });
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });
});

// Настройка загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Создание таблиц
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    apartment TEXT,
    message TEXT,
    category TEXT,
    status TEXT DEFAULT 'Новая',
    image TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT,
    vote TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT,
    date TEXT,
    amount INTEGER,
    description TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT,
    house TEXT,
    feedback TEXT
  )`);
});

// Получение жалоб
app.get('/api/complaints', (req, res) => {
  const { category, status } = req.query;
  let query = 'SELECT * FROM complaints';
  const params = [];
  
  if (category || status) {
    query += ' WHERE';
    if (category) {
      query += ' category = ?';
      params.push(category);
    }
    if (status) {
      query += category ? ' AND status = ?' : ' status = ?';
      params.push(status);
    }
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).send(err.message);
    res.json(rows);
  });
});

// Создание жалобы
app.post('/api/complaints', upload.single('image'), (req, res) => {
  const { name, apartment, message, category } = req.body;
  const image = req.file ? req.file.filename : null;

  db.run(
    'INSERT INTO complaints (name, apartment, message, category, image) VALUES (?, ?, ?, ?, ?)',
    [name, apartment, message, category, image],
    function (err) {
      if (err) return res.status(500).send(err.message);
      res.json({ id: this.lastID });
    }
  );
});

// Обновление статуса жалобы
app.patch('/api/complaints/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.run('UPDATE complaints SET status = ? WHERE id = ?', [status, id], function (err) {
    if (err) return res.status(500).send(err.message);
    res.json({ success: true });
  });
});

// Голосование
app.get('/api/votes', (req, res) => {
  db.all('SELECT vote, COUNT(*) as count FROM votes GROUP BY vote', (err, rows) => {
    if (err) return res.status(500).send(err.message);
    const results = { yes: 0, no: 0 };
    rows.forEach(row => {
      if (row.vote === 'yes') results.yes = row.count;
      if (row.vote === 'no') results.no = row.count;
    });
    res.json(results);
  });
});

app.post('/api/votes', (req, res) => {
  const { vote, user } = req.body;
  db.run('INSERT INTO votes (user, vote) VALUES (?, ?)', [user, vote], function (err) {
    if (err) return res.status(500).send(err.message);
    res.json({ success: true });
  });
});

// Платежи
app.get('/api/payments', (req, res) => {
  const { user } = req.query;
  db.all('SELECT * FROM payments WHERE user = ?', [user], (err, rows) => {
    if (err) return res.status(500).send(err.message);
    res.json(rows);
  });
});

// Аналитика
app.get('/api/analytics', (req, res) => {
  db.all('SELECT category, status, COUNT(*) as count FROM complaints GROUP BY category, status', (err, rows) => {
    if (err) return res.status(500).send(err.message);
    const analytics = {
      totalComplaints: 0,
      newComplaints: 0,
      resolvedComplaints: 0,
      byCategory: {},
    };
    rows.forEach(row => {
      analytics.totalComplaints += row.count;
      if (row.status === 'Новая') analytics.newComplaints += row.count;
      if (row.status === 'Решено') analytics.resolvedComplaints += row.count;
      analytics.byCategory[row.category] = (analytics.byCategory[row.category] || 0) + row.count;
    });
    res.json(analytics);
  });
});

// Отзывы
app.post('/api/feedback', (req, res) => {
  const { house, feedback, user } = req.body;
  db.run('INSERT INTO feedback (user, house, feedback) VALUES (?, ?, ?)', [user, house, feedback], function (err) {
    if (err) return res.status(500).send(err.message);
    res.json({ success: true });
  });
});

// Уведомления
app.post('/api/notifications', (req, res) => {
  const { message } = req.body;
  // В реальном проекте здесь будет отправка пуш-уведомлений
  res.json({ success: true });
});

app.listen(port, () => {
  console.log(`✅ Сервер запущен на http://localhost:${port}`);
  console.log(`✅ WebSocket на ws://localhost:3001`);
});