import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('staff', (table) => {
    table.increments('id').primary();
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('name', 255).notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('vehicles', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('plate_number', 50).unique().notNullable();
    table.string('category', 100).notNullable();
    table.decimal('daily_rate', 10, 2).notNullable();
    table.string('photo_path', 500).nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamps(true, true);

    table.index('category');
    table.index('deleted_at');
  });

  await knex.schema.createTable('rentals', (table) => {
    table.increments('id').primary();
    table
      .integer('vehicle_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('vehicles')
      .onDelete('RESTRICT');
    table.string('customer_name', 255).notNullable();
    table.string('customer_phone', 50).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.decimal('total_amount', 10, 2).notNullable();
    table.string('status', 20).defaultTo('booked');
    table.timestamps(true, true);

    table.index('vehicle_id');
    table.index('status');
    table.index(['start_date', 'end_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rentals');
  await knex.schema.dropTableIfExists('vehicles');
  await knex.schema.dropTableIfExists('staff');
}
