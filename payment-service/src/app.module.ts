import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SettlementsModule } from './settlements/settlements.module';
import { HealthModule } from './health/health.module';
import { MerchantsModule } from './merchants/merchants.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    TransactionsModule,
    SettlementsModule,
    HealthModule,
    MerchantsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
