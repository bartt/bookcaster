/* eslint-disable no-console */
import { knex, config } from './models/index.js';
import { server } from './server/index.js';
import { Command } from 'commander';

const commander = new Command();
commander
  .option('-p, --port <value>', 'Port to listen on.', '8080')
  .option('-h, --host <value>', 'Host IP address to listen on.', '::');

commander.parse();

const options = commander.opts();

server.listen({ port: options.port, host: '::' }, async (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  // Setup the database
  await knex.migrate.latest(config.migrations);

  console.log(`Server listening at ${address}`);
});
