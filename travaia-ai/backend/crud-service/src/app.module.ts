import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirestoreModule } from './firestore/firestore.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [FirestoreModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
