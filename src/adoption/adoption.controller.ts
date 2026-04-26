import { Controller, Post, Get, Put, Param, Body, Req, ParseIntPipe } from '@nestjs/common';
import { AdoptionService } from './adoption.service';

@Controller('adoption')
export class AdoptionController {
  constructor(private readonly adoptionService: AdoptionService) {}

  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.adoptionService.createRequest(body);
  }

  @Get('requests')
  findAllRequests() {
    return this.adoptionService.findAllRequests();
  }

  @Put(':id/approved')
  async approve(@Param('id', ParseIntPipe) id: number) {
    console.log(`Approving request ${id}`); // 🆕 LOG
    return this.adoptionService.updateStatus(id, 'Approved');
  }

  @Put(':id/rejected')
  async reject(@Param('id', ParseIntPipe) id: number) {
    console.log(`Rejecting request ${id}`); // 🆕 LOG
    return this.adoptionService.updateStatus(id, 'Rejected');
  }
}