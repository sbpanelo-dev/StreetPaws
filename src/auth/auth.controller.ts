import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Query,
  UseGuards 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DatabaseService } from '../database/database.service';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private db: DatabaseService  // ✅ Add DatabaseService
  ) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const user = await this.authService.validateUser(body.username, body.password);
    if (!user) {
      return { error: 'Invalid credentials' };
    }
    return this.authService.login(user);
  }

  // ✅ NEW: REGISTER ENDPOINT
  @Post('register')
  async register(@Body() body: { 
    username: string; 
    password: string; 
    role?: 'Admin' | 'User' | 'Staff' 
  }) {
    try {
      // Check if user exists
      const existingUser = await this.db.queryOne(
        'SELECT user_id FROM users WHERE username = ?',
        [body.username]
      );
      
      if (existingUser) {
        return { error: 'Username already exists' };
      }

      // Hash password & create user
      const hashedPassword = await this.authService.hashPassword(body.password);
      const result = await this.db.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [body.username, hashedPassword, body.role || 'User']
      );

      // Get new user (without password)
      const newUser = await this.db.queryOne(
        'SELECT user_id, username, role, created_at FROM users WHERE user_id = ?',
        [result.insertId]
      );

      return {
        success: true,
        message: 'User registered successfully!',
        user: newUser
      };
    } catch (error) {
      return { error: 'Registration failed. Try again.' };
    }
  }

  // ✅ BONUS: Password hash tester
  @Get('hash-test')
  async hashTest(@Query('password') password: string) {
    const hash = await this.authService.hashPassword(password || 'password');
    return { password: password || 'password', hash };
  }
  
}