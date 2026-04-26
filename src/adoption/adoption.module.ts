// src/adoption/adoption.module.ts
import { Module } from '@nestjs/common';
import { AdoptionController } from './adoption.controller';
import { AdoptionService } from './adoption.service';
import { DatabaseService } from '../database/database.service';

@Module({
  controllers: [AdoptionController],
  providers: [AdoptionService, DatabaseService],
})
export class AdoptionModule {}