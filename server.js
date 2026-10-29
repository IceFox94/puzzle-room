const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { getGame, listGames } = require('./games');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/games', (req, res) => {
  res.json(listGames());
});

// rooms: Map<`${gameId}:${roomId}`, Room>
const rooms = new Map();

function roomKey(gameId, roomId) {
  return `${gameId}:${roomId}`;
}

function createRoom(gameId, roomId) {
  const game = getGame(gameId);
  if (!game) return null;
  const room = {
    gameId,
    roomId,
    state: game.createState(),
    players: new Map(),
  };
  rooms.set(roomKey(gameId, roomId), room);
  return room;
}

function roomSnapshot(room) {
  const game = getGame(room.gameId);
  const solved = game.isSolved(room.state);
  return {
    gameId: room.gameId,
    gameTitle: game.title,
    roomId: room.roomId,
    state: game.publicState(room.state),
    solved,
    players: Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      moves: p.moves,
      firstWinAt: p.firstWinAt,
      solvedMoves: p.solvedMoves,
      solved: p.solved,
    })),
  };
}

function adminSnapshot() {
  const grouped = {};
  for (const game of listGames()) grouped[game.id] = [];
  for (const room of rooms.values()) {
    const snap = roomSnapshot(room);
    if (!grouped[room.gameId]) grouped[room.gameId] = [];
    grouped[room.gameId].push(snap);
  }
  return { games: listGames(), rooms: grouped };
}

function broadcastRoom(room) {
  io.to(`room:${room.gameId}:${room.roomId}`)
    .emit('state', roomSnapshot(room));
  io.to('admin').emit('admin:update', adminSnapshot());
}

io.on('connection', (socket) => {
  socket.on('join', ({ gameId, roomId, name }) => {
    if (!gameId || !roomId) return;
    const game = getGame(gameId);
    if (!game) {
      socket.emit('error-msg', 'Неизвестная игра.');
      return;
    }

    let room = rooms.get(roomKey(gameId, roomId));
    if (!room) room = createRoom(gameId, roomId);

    const finalName = (name || socket.data.name || 'Игрок')
      .trim().slice(0, 30) || 'Игрок';

    socket.data.gameId = gameId;
    socket.data.roomId = roomId;
    socket.data.name = finalName;

    const existing = room.players.get(socket.id);
    if (existing) {
      existing.name = finalName;
    } else {
      room.players.set(socket.id, {
        id: socket.id,
        name: finalName,
        moves: 0,
        firstWinAt: null,
        solvedMoves: null,
        solved: false,
      });
    }

    socket.join(`room:${gameId}:${roomId}`);
    broadcastRoom(room);
  });

  socket.on('move', (payload) => {
    const { gameId, roomId } = socket.data;
    if (!gameId || !roomId) return;
    const room = rooms.get(roomKey(gameId, roomId));
    if (!room) return;
    const game = getGame(gameId);

    const result = game.applyMove(room.state, payload);
    if (!result.ok) {
      socket.emit('error-msg', result.error || 'Недопустимый ход.');
      return;
    }

    const player = room.players.get(socket.id);
    if (player) player.moves++;

    const solved = game.isSolved(room.state);
    if (solved && player && !player.solved) {
      player.solved = true;
      player.firstWinAt = Date.now();
      player.solvedMoves = player.moves;
    }

    // индивидуальная подсказка — только этому игроку
    if (game.getHint && player) {
      const hint = game.getHint(room.state, player.moves);
      if (hint) socket.emit('hint', hint);
    }

    broadcastRoom(room);
  });

  socket.on('reset', () => {
    const { gameId, roomId } = socket.data;
    if (!gameId || !roomId) return;
    const room = rooms.get(roomKey(gameId, roomId));
    if (!room) return;
    const game = getGame(gameId);
    room.state = game.createState();
    for (const p of room.players.values()) {
      p.moves = 0;
      p.solved = false;
      // firstWinAt и solvedMoves не трогаем — это «первая победа»
    }
    broadcastRoom(room);
  });

  socket.on('admin:subscribe', () => {
    socket.join('admin');
    socket.emit('admin:update', adminSnapshot());
  });

  socket.on('admin:player', ({ gameId, roomId, playerId }, ack) => {
    const room = rooms.get(roomKey(gameId, roomId));
    if (!room) return ack && ack({ error: 'Комната не найдена.' });
    const player = room.players.get(playerId);
    if (!player) return ack && ack({ error: 'Игрок не найден.' });
    const game = getGame(gameId);
    if (ack) ack({
      player: {
        id: player.id,
        name: player.name,
        moves: player.moves,
        firstWinAt: player.firstWinAt,
        solvedMoves: player.solvedMoves,
        solved: player.solved,
      },
      room: roomSnapshot(room),
      progress: game.playerProgress(room.state, player),
    });
  });

  socket.on('disconnect', () => {
    const { gameId, roomId } = socket.data;
    if (!gameId || !roomId) return;
    const room = rooms.get(roomKey(gameId, roomId));
    if (!room) return;
    room.players.delete(socket.id);
    broadcastRoom(room);
  });
});

server.listen(PORT, () => {
  console.log(`Puzzle Room running on http://localhost:${PORT}`);
});