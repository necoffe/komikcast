const sources = {
  komikcast: {
    name: 'Komikcast',
    baseUrl: 'https://v1.komikcast.fit',
    backendUrl: 'https://be.komikcast.fit',
    comicsListUrl: '/series',
    comicDetailBase: '/series/',
    genresUrl: '/genres',
    popularMangaUrl: '/popular'
  }
  // Tambahkan sumber lain di sini, misal:
  // komiku: { name: 'Komiku', baseUrl: 'https://komiku.id', comicsListUrl: '/manga/', ... }
};

module.exports = { sources };