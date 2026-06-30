// apps/api/src/common/adapters/redis-io.adapter.ts
//
// Socket.io adapter backed by Redis pub/sub.
//
// Without this, each API replica runs its own isolated in-memory Socket.io
// server: a chat message emitted on replica A would never reach a client
// connected to replica B. This adapter wires both servers' Socket.io
// instances together through a Redis pub/sub channel pair, so
// `server.emit(...)` (and room-scoped emits) reach every connected client
// regardless of which replica they're attached to.
//
// Used in main.ts:
//   const redisIoAdapter = new RedisIoAdapter(app);
//   await redisIoAdapter.connectToRedis();
//   app.useWebSocketAdapter(redisIoAdapter);

import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplicationContext } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private pubClient?: Redis;
  private subClient?: Redis;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  /**
   * Establishes the pub/sub Redis connections used to fan out Socket.io
   * events across replicas. Must be called (and awaited) before
   * `useWebSocketAdapter()` / `app.listen()`, since gateways create their
   * underlying Socket.io server eagerly on startup.
   */
  async connectToRedis(): Promise<void> {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL environment variable is required (RedisIoAdapter)');
    }

    this.pubClient = new Redis(url, {
      retryStrategy: (times) => Math.min(times * 200, 30_000),
    });
    this.subClient = this.pubClient.duplicate();

    this.pubClient.on('error', (err: Error) => {
      this.logger.error(`Redis pubClient error: ${err.message}`);
    });
    this.subClient.on('error', (err: Error) => {
      this.logger.error(`Redis subClient error: ${err.message}`);
    });

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        this.pubClient!.once('ready', resolve);
        this.pubClient!.once('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        this.subClient!.once('ready', resolve);
        this.subClient!.once('error', reject);
      }),
    ]);

    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    this.logger.log('Redis Socket.io adapter connected (pub/sub ready)');
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (!this.adapterConstructor) {
      throw new Error(
        'RedisIoAdapter.connectToRedis() must be called before createIOServer()',
      );
    }
    server.adapter(this.adapterConstructor);
    return server;
  }
}
