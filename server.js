require('dotenv').config();
const express = require('express');
const http = require('http'); // ✅ must import http
const path = require('path');
const mysql = require('mysql2/promise');
const { Server } = require('socket.io');

const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'chat_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// API to get last messages
app.get('/api/messages', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  try {
    const [rows] = await pool.query(
      'SELECT id, user_name, message, created_at FROM messages ORDER BY id DESC LIMIT ?',
      [limit]
    );
    res.json(rows.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Start server with port fallback
let PORT = parseInt(process.env.PORT) || 3000;

function startServer(port) {
  const server = http.createServer(app);
  const io = new Server(server);

  // Socket.io
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (userName) => {
      socket.data.userName = userName || 'Anonymous';
      console.log(`${socket.id} joined as ${socket.data.userName}`);
    });

    socket.on('chat message', async (msg) => {
      const userName = socket.data.userName || 'Anonymous';
      const text = String(msg).slice(0, 2000);

      try {
        const [result] = await pool.query(
          'INSERT INTO messages (user_name, message) VALUES (?, ?)',
          [userName, text]
        );

        const messageObj = {
          id: result.insertId,
          user_name: userName,
          message: text,
          created_at: new Date().toISOString()
        };

        io.emit('chat message', messageObj);
      } catch (err) {
        console.error('Failed to save message:', err);
        socket.emit('error', 'Message not saved');
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Listen and handle port errors
  server.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} in use, trying ${port + 1}...`);
      startServer(port + 1); // retry next port
    } else {
      console.error(err);
    }
  });
}

startServer(PORT);
