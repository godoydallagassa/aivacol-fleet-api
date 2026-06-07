import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client?: RedisClientType;
  private ready = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.getOrThrow<string>('REDIS_HOST');
    const port = this.configService.getOrThrow<string>('REDIS_PORT');

    this.client = createClient({
      url: `redis://${host}:${port}`,
    });

    this.client.on('error', (error: Error) => {
      this.ready = false;
      this.logger.warn(`Redis unavailable: ${error.message}`);
    });

    try {
      await this.client.connect();
      this.ready = true;
    } catch (error) {
      this.ready = false;
      this.logger.warn(`Redis connection skipped: ${String(error)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.ready) {
      return null;
    }

    const value = await this.client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.client || !this.ready) {
      return;
    }

    await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
  }

  async deleteByPattern(pattern: string): Promise<void> {
    if (!this.client || !this.ready) {
      return;
    }

    const keys = await this.client.keys(pattern);

    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }
}
