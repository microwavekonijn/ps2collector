import {
  Inject,
  Logger,
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { CensusClient, PS2Environment } from 'ps2census';
import { first, fromEvent, share, takeUntil, timer } from 'rxjs';

const environments = ['ps2', 'ps2ps4eu', 'ps2ps4us'];

@Module({
  providers: [
    ...environments.map((environment) => ({
      provide: environment,
      useFactory: () => {
        const client = new CensusClient(
          process.env.CENSUS_SERVICE_ID,
          <PS2Environment>environment,
          {
            streamManager: {
              subscription: {
                eventNames: ['all','ContinentLock','AchievementEarned',"BattleRankUp",
			"Death",
			"FacilityControl",
			"GainExperience",
			"ItemAdded",
			"MetagameEvent",
			"PlayerFacilityCapture",
			"PlayerFacilityDefend",
			"PlayerLogin",
			"PlayerLogout",
			"SkillAdded",
			"VehicleDestroy"],
                 characters: ['all'],
                worlds: ['all','1','10','13','17','19','40','1000','2000'],
              },
            },
          },
        );
        const logger = new Logger(environment);

        client
          .on('ready', () => logger.log('Connected'))
          .on('reconnecting', () => logger.log('Reconnecting'))
          .on('disconnected', () => logger.log('Disconnected'))
          .on('warn', (error) => logger.warn(error));

        return client;
      },
    })),
  ],
  exports: [...environments],
})
export class CensusModule
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private static readonly RESUBSCRIBE_INTERVAL = 30 * 60 * 1000;

  @Inject('ps2')
  private readonly pcClient: CensusClient;

  @Inject('ps2ps4eu')
  private readonly ps4euClient: CensusClient;

  @Inject('ps2ps4us')
  private readonly ps4usClient: CensusClient;

  async onApplicationBootstrap() {
    await Promise.all(
      [this.pcClient, this.ps4euClient, this.ps4usClient].map((client) =>
        this.connectClient(client),
      ),
    );
  }

  onApplicationShutdown() {
    this.pcClient.destroy();
    this.ps4euClient.destroy();
    this.ps4usClient.destroy();
  }

  private async connectClient(client: CensusClient): Promise<void> {
    const close = fromEvent(client, 'disconnected').pipe(share(), first());

    await client.watch();

    timer(CensusModule.RESUBSCRIBE_INTERVAL, CensusModule.RESUBSCRIBE_INTERVAL)
      .pipe(takeUntil(close))
      .subscribe(() => {
        client.resubscribe();
      });
  }
}
