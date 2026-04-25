import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Query,
  UnauthorizedException 
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private db: DatabaseService
  ) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    try {
      const user = await this.authService.validateUser(body.username, body.password);
      return this.authService.login(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Post('register')
  async register(@Body() body: { 
    username: string; 
    password: string; 
    role?: 'Admin' | 'User' | 'Staff'; 
    name?: string;
    email?: string;
  }) {
    try {
      // Check if user exists
      const existingUser = await this.db.queryOne(
        'SELECT user_id FROM users WHERE username = ?',
        [body.username.trim()]
      );
      
      if (existingUser) {
        return { 
          error: true,
          message: 'Username already exists'
        };
      }

      // Hash password
      const hashedPassword = await this.authService.hashPassword(body.password);
      
      // ✅ FIXED - Safe columns only (works with your current DB)
      const result = await this.db.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [
          body.username.trim(),
          hashedPassword, 
          body.role || 'User'
        ]
      );

      // Get new user (safe SELECT)
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
      console.error('Register error:', error);
      return { 
        error: true,
        message: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  @Get('hash-test')
  async hashTest(@Query('password') password: string) {
    const hash = await this.authService.hashPassword(password || 'password');
    return { 
      original: password || 'password', 
      hash,
      message: 'Copy this hash to DB password column for testing'
    };
  }

  @Get('debug-login')
  async debugLogin(@Query('username') username: string, @Query('password') password: string) {
    try {
      console.log('🔍 DEBUG:', { username, password });
      
      const user = await this.db.queryOne('SELECT * FROM users WHERE username = ?', [username]);
      console.log('👤 USER:', user ? `${user.username} (ID:${user.user_id})` : 'NOT FOUND');

      if (!user) return { error: 'User not found', exists: false };

      const passField = user.password_hash || user.password;
      console.log('🔑 PASS FIELD:', passField ? 'EXISTS' : 'MISSING');

      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(password || '', passField || '');
      console.log('✅ BCRYPT:', isValid);

      if (!isValid) {
        return { 
          error: 'Password mismatch', 
          bcrypt: false, 
          passField: !!passField 
        };
      }

      const result = await this.authService.login(user);
      return {
        success: true,
        tokenPreview: result.token.substring(0, 20) + '...',
        user: result.user
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}