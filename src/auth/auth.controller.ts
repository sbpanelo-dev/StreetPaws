import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Query,
  UnauthorizedException 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DatabaseService } from '../database/database.service';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcryptjs';

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
      // ✅ Fixed: Proper error handling
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

      const hashedPassword = await this.authService.hashPassword(body.password);
      
      const result = await this.db.query(
        `INSERT INTO users (username, password_hash, role, name, email) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          body.username.trim(),
          hashedPassword, 
          body.role || 'User',
          body.name || body.username,
          body.email || null
        ]
      );

      const newUser = await this.db.queryOne(
        'SELECT user_id, username, role, name, email, created_at FROM users WHERE user_id = ?',
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
      message: 'Copy this hash to DB password_hash column'
    };
  }

  // 🔥 DEBUG ENDPOINT - Remove after fixing
  @Get('debug-login')
  async debugLogin(@Query('username') username: string, @Query('password') password: string) {
    try {
      console.log('🔍 DEBUG:', { username, password });
      
      const user = await this.db.queryOne('SELECT * FROM users WHERE username = ?', [username]);
      console.log('👤 USER:', user ? `${user.username} (ID:${user.user_id})` : 'NOT FOUND');

      if (!user) return { error: 'User not found', exists: false };

      const passField = user.password_hash || user.password;
      console.log('🔑 PASS FIELD:', passField ? 'EXISTS' : 'MISSING');

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