import { numberFromEnv } from './env';

export const vehiclesCacheTtlSeconds = () =>
  numberFromEnv('VEHICLES_CACHE_TTL_SECONDS', 60, 1);
