import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthService {
  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.db.queryOne(
      'SELECT * FROM users WHERE username = ?',
      [username.trim()]
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // ✅ Fix: Single password field check
    const passwordField = user.password_hash || user.password;
    const isValidPassword = await bcrypt.compare(password, passwordField);
    
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // ✅ Fix: Destructure ALL password fields at once
    const { password: _, password_hash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { 
      username: user.username, 
      sub: user.user_id, 
      role: user.role 
    };
    
    return {
      token: this.jwtService.sign(payload),
      user: { 
        user_id: user.user_id, 
        username: user.username, 
        role: user.role 
      }
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}