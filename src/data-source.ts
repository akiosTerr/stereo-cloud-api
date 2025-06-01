import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DB_PATH || 'database.sqlite',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
});