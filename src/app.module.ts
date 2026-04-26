import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AnimalsModule } from './animals/animals.module';  // ✅ Add this
import { AdoptionModule } from './adoption/adoption.module';
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    AdoptionModule,
    AnimalsModule,  // ✅ Add AnimalsModule
  ],
})
export class AppModule {}