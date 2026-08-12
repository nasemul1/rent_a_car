import knex from 'knex';
import knexConfig from '../knexfile';

process.env.NODE_ENV = 'test';

const db = knex(knexConfig.test);

beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();
});

afterAll(async () => {
  await db.destroy();
});

export { db };
