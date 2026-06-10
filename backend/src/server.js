require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middleware/errorHandler');
const { getAllUsersPublic } = require('./services/userService');

const app = express();
const server = http.createServer(app);

// Socket.io — allow connections from Expo Go on local network
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT'],
  },
});

app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Plumber Availability API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', async (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send current user list to newly connected client
  try {
    const users = await getAllUsersPublic();
    socket.emit('usersList', users);
  } catch (error) {
    console.error('Failed to send initial users list:', error.message);
  }

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not defined in .env file');
    process.exit(1);
  }

  await connectDB();

  server.listen(PORT, process.env.CLIENT_URL, () => {
    console.log(`Server running on ${process.env.CLIENT_URL}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
