import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import gameManager from './socket/gameManager.js';
import { log } from './utils/logger.js';

const app = express();
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => res.send({ status: 'Shadowbound server alive' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ['http://localhost:3000'], methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  log('connected', socket.id);
  gameManager(io, socket);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => log(`Server listening on ${PORT}`));
