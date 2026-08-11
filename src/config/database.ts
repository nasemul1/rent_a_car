import knex, { Knex } from 'knex';
import { config } from './env';

const knexInstance: Knex = knex({
  client: 'pg',
  connection: config.db.url,
  migrations: {
    directory: './src/migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './src/seeds',
    extension: 'ts',
  },
});

export default knexInstance;
