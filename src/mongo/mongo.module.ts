import { Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Db, MongoClient } from 'mongodb';

@Module({
  providers: [
    {
      provide: MongoClient,
      useFactory: () => {
        const client = new MongoClient(process.env.MONGODB_URL);
        const logger = new Logger('MongoClient');

        client
          .on('open', () => logger.log('Connected to MongoDB'))
          .on('close', () => logger.log('Disconnected from MongoDB'));

        return client;
      },
    },
    {
      provide: Db,
      useFactory: (mongodb: MongoClient) =>
        mongodb.db(process.env.MONGODB_DATABASE),
      inject: [MongoClient],
    },
  ],
  exports: [Db],
})
export class MongoModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly mongodb: MongoClient) {}

  async onModuleInit(): Promise<void> {
    await this.mongodb.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.mongodb.close();
  }
}
