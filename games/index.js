const games = {
  hanoi: require('./hanoi'),
  lightsout: require('./lightsout'),
  separate: require('./separate'),
};

function getGame(id) {
  return games[id] || null;
}

function listGames() {
  return Object.values(games).map(g => ({
    id: g.id,
    title: g.title,
    description: g.description || '',
  }));
}

module.exports = { getGame, listGames };