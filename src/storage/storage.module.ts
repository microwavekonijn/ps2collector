import { Inject, Module, OnApplicationBootstrap } from '@nestjs/common';
import { MongoModule } from '../mongo/mongo.module';
import { CensusModule } from '../census/census.module';
import { CensusClient, PS2Event } from 'ps2census';
import { fromEvent, merge } from 'rxjs';
import { Db } from 'mongodb';

@Module({
  imports: [MongoModule, CensusModule],
})
export class StorageModule implements OnApplicationBootstrap {
  @Inject('ps2')
  private readonly pcClient: CensusClient;

  @Inject('ps2ps4eu')
  private readonly ps4euClient: CensusClient;

  @Inject('ps2ps4us')
  private readonly ps4usClient: CensusClient;

  @Inject(Db) private readonly db: Db;

  onApplicationBootstrap() {
    merge(
      fromEvent(this.pcClient, 'ps2Event'),
      fromEvent(this.ps4euClient, 'ps2Event'),
      fromEvent(this.ps4usClient, 'ps2Event'),
    ).subscribe((event: PS2Event) => {
      void this.db
        .collection(`${event.world_id}:${event.event_name}`)
        .insertOne(event.raw);
    });

    merge(
      fromEvent(this.pcClient, 'serviceState'),
      fromEvent(this.ps4euClient, 'serviceState'),
      fromEvent(this.ps4usClient, 'serviceState'),
    ).subscribe(([worldId, state]) => {
      void this.db
        .collection(`serviceState`)
        .insertOne({ worldId, state, at: Math.round(Date.now() / 1000) });
    });
  }
}
