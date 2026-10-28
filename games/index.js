const games = {
  hanoi: require('./hanoi'),
  lightsout: require('./lightsout'),
};

function getGame(id) {
  return games[id] || null;
}

function listGames() {
  return Object.values(games).map(g => ({ id: g.id, title: g.title }));
}

module.exports = { getGame, listGames };