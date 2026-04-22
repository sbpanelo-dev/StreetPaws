import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  ParseIntPipe, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService, CreateUserDto } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ✅ PUBLIC: List all users (no auth)
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  // ✅ PUBLIC: Get single user
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // ✅ ADMIN ONLY: Create user
  @Post()
@UseGuards(JwtAuthGuard)
async create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
  // ✅ Allow Admin OR Staff
  if (!['Admin', 'Staff'].includes(req.user.role)) {
    return { 
      error: 'Admin or Staff access required', 
      yourRole: req.user.role,
      allowedRoles: ['Admin', 'Staff']
    };
  }
  return this.usersService.create(createUserDto);
}

  // ✅ ADMIN ONLY: Update user
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateData: Partial<CreateUserDto>,
    @Request() req: any
  ) {
    if (req.user.role !== 'Admin') {
      return { error: 'Admin access required' };
    }
    return this.usersService.update(id, updateData);
  }

  // ✅ ADMIN ONLY: Delete user
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    if (req.user.role !== 'Admin') {
      return { error: 'Admin access required' };
    }
    return this.usersService.remove(id);
  }
}