require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middleware/errorHandler');
const { getAllPlumbersPublic } = require('./services/userService');

const app = express();
const server = http.createServer(app);
const NOTIFICATION_INTERVAL_MS = 5000;

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT'],
  },
});

app.set('io', io);

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Plumber Availability API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

io.on('connection', async (socket) => {
  console.log(`Client connected: ${socket.id}`);

  try {
    const plumbers = await getAllPlumbersPublic();
    socket.emit('plumbersList', plumbers);
  } catch (error) {
    console.error('Failed to send initial plumbers list:', error.message);
  }

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const startNotificationLoop = () => {
  setInterval(async () => {
    if (io.engine.clientsCount === 0) {
      return;
    }

    try {
      const plumbers = await getAllPlumbersPublic();
      const availableCount = plumbers.filter((user) => user.status === 'available').length;
      const workingCount = plumbers.filter((user) => user.status === 'working').length;

      io.emit('notification', {
        title: 'Availability Update',
        message: `${availableCount} available, ${workingCount} working`,
        sentAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to send availability notification:', error.message);
    }
  }, NOTIFICATION_INTERVAL_MS);
};

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not defined in .env file');
    process.exit(1);
  }

  await connectDB();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startNotificationLoop();
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
