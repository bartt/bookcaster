const config = {
  client: 'sqlite3',
  connection: {
    filename: './data/library.db',
  },
  useNullAsDefault: true,
  migrations: {
    directory: 'dist/migrations',
    extension: 'js'
  },
};

export default config;