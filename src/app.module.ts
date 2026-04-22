import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AnimalsModule } from './animals/animals.module';  // ✅ Add this

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    AnimalsModule,  // ✅ Add AnimalsModule
  ],
})
export class AppModule {}