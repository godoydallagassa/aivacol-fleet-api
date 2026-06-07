import { DataSource } from 'typeorm';
import { loadLocalEnv } from '../config/env';
import { databaseOptions } from '../config/database-options';

loadLocalEnv();

export default new DataSource(databaseOptions());
