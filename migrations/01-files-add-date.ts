import { knex, Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
    return knex.schema.alterTable('files', (table) => {
        table.date('date')
    })
}

export async function down(knex: Knex): Promise<any> {
    return knex.schema.alterTable('files', (table) => {
        table.dropColumn('date')
    })
}