const config = {
  client: 'sqlite3',
  connection: {
    filename: './data/library.db',
  },
  useNullAsDefault: true,
  migrations: {
    directory: 'migrations',
    extension: 'ts'
  },
}

export default config