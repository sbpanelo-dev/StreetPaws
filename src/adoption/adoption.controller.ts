import { Controller, Post, Get, Put, Param, Body, Req, ParseIntPipe } from '@nestjs/common';
import { AdoptionService } from './adoption.service';

@Controller('adoption')
export class AdoptionController {
  constructor(private readonly adoptionService: AdoptionService) {}

  @Post()
async create(@Body() body: any, @Req() req: any) {
  try {
    return await this.adoptionService.createRequest(body);
  } catch (error) {
    console.error('Adoption create error:', error);
    throw error;
  }
}

  @Get('requests')
  findAllRequests() {
    return this.adoptionService.findAllRequests();
  }

  @Put(':id/approved')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.adoptionService.updateStatus(id, 'Approved');
  }

  @Put(':id/rejected')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.adoptionService.updateStatus(id, 'Rejected');
  }
}