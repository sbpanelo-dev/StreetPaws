import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Param, 
  Body, 
  Req, 
  ParseIntPipe,
  UseGuards 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // 🆕 Import your auth guard
import { AdoptionService } from './adoption.service';

@Controller('adoption')
export class AdoptionController {
  constructor(private readonly adoptionService: AdoptionService) {}

  // 🆕 PROTECTED: Create adoption request (requires auth)
@Post()
async create(@Body() body: any) {
  return this.adoptionService.createRequest(body);
}

  // 🆕 PUBLIC: Admin sees all requests
  @Get('requests')
  findAllRequests() {
    return this.adoptionService.findAllRequests();
  }

  // 🆕 PROTECTED: User clears THEIR OWN history
@Delete('requests/clear')
async clearHistory() {
  return this.adoptionService.clearAllHistory();
}

  @Put(':id/approved')
  async approve(@Param('id', ParseIntPipe) id: number) {
    console.log(`Approving request ${id}`);
    return this.adoptionService.updateStatus(id, 'Approved');
  }

  @Put(':id/rejected')
  async reject(@Param('id', ParseIntPipe) id: number) {
    console.log(`Rejecting request ${id}`);
    return this.adoptionService.updateStatus(id, 'Rejected');
  }
}