import { knex, config } from './models/index.js';
import { server } from './server/index.js';

server.listen({ port: 8080, host: '::' }, async (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  // Setup the database
  await knex.migrate.latest(config.migrations);

  console.log(`Server listening at ${address}`);
});
