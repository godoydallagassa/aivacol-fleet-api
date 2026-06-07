import { DataSourceOptions } from 'typeorm';
import { requiredEnv, requiredNumberFromEnv } from './env';
import { User } from '../users/entities/user.entity';
import { Model } from '../models/entities/model.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';

export function databaseOptions(): DataSourceOptions {
  return {
    type: 'mssql',
    host: requiredEnv('DB_HOST'),
    port: requiredNumberFromEnv('DB_PORT', 1),
    username: requiredEnv('DB_USERNAME'),
    password: requiredEnv('DB_PASSWORD'),
    database: requiredEnv('DB_DATABASE'),
    entities: [User, Model, Vehicle],
    migrations: [`${__dirname}/../database/migrations/*{.ts,.js}`],
    synchronize: false,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  };
}
