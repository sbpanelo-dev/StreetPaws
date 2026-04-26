// src/adoption/adoption.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AdoptionService } from './adoption.service';

@Controller('adoption')
export class AdoptionController {
  constructor(private readonly adoptionService: AdoptionService) {}

  @Post()
  create(@Body() body: any) {
    return this.adoptionService.createRequest(body);
  }
}