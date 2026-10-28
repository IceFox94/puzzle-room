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
  }

  // индивидуальная подсказка — только этому игроку
  if (game.getHint && player) {
    const hint = game.getHint(room.state, player.moves);
    if (hint) socket.emit('hint', hint);
  }

  broadcastRoom(room);
});