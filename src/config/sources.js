const sources = {
  komikcast: {
    name: 'Komikcast',
    baseUrl: 'https://v1.komikcast.fit',
    backendUrl: 'https://be.komikcast.fit',
    comicsListUrl: '/series',
    comicDetailBase: '/series/',
    genresUrl: '/genres',
    popularMangaUrl: '/popular'
  },
  kiryuu: {
    name: 'Kiryuu',
    baseUrl: 'https://kiryuu03.com',
    comicsListUrl: '/',
    comicDetailBase: '/manga/',
    genresUrl: '/advanced-search/',
    popularMangaUrl: '/'
  }
  // Tambahkan sumber lain di sini, misal:
  // komiku: { name: 'Komiku', baseUrl: 'https://komiku.id', comicsListUrl: '/manga/', ... }
};

module.exports = { sources };