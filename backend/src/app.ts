// Load environment variables first, before any other imports
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/database';
import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import SocketManager from './utils/socketManager';
import { pineconeService } from './services/ai/pineconeService';

// Routes
import authRoutes from './routes/auth';
import workspaceRoutes from './routes/workspaces';
import channelRoutes from './routes/channels';
import messageRoutes from './routes/messages';
import messageActionRoutes from './routes/messageActions';
import aiRoutes from './routes/ai';
import fileRoutes from './routes/files';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", 'http://localhost:3001', "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true
});

// Connect to MongoDB
connectDB();

// Initialize AI services
pineconeService.initializeIndex().catch(console.error);

// Middleware
app.use(helmet());
app.use(cors({
  origin: ["http://localhost:3000", 'http://localhost:3001'],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Basic health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Slack Clone API with AI Features',
    version: '1.0.0',
    status: 'running'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', authenticateToken, workspaceRoutes);
app.use('/api/channels', authenticateToken, channelRoutes);
app.use('/api/messages', authenticateToken, messageRoutes);
app.use('/api/message-actions', messageActionRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/files', fileRoutes);

// Error handling middleware
app.use(errorHandler);

// Socket.IO connection handling
const socketManager = new SocketManager(io);

// Make socketManager available globally for message broadcasting
export { socketManager };

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🌐 CORS enabled for: http://localhost:3000, http://localhost:3001`);
});

export default app;
