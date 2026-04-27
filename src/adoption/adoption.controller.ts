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
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: any, @Req() req: any) {
    // Add user_id to request data
    body.user_id = req.user.user_id;
    return this.adoptionService.createRequest(body);
  }

  // 🆕 PUBLIC: Admin sees all requests
  @Get('requests')
  findAllRequests() {
    return this.adoptionService.findAllRequests();
  }

  // 🆕 PROTECTED: User sees THEIR OWN requests
  @Get('my-requests')
  @UseGuards(JwtAuthGuard)
  async getMyRequests(@Req() req: any) {
    const userId = req.user.user_id;
    return this.adoptionService.findUserRequests(userId);
  }

  // 🆕 PROTECTED: User clears THEIR OWN history
  @Delete('requests/clear')
  @UseGuards(JwtAuthGuard)
  async clearMyHistory(@Req() req: any) {
    const userId = req.user.user_id;
    return this.adoptionService.clearUserHistory(userId);
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