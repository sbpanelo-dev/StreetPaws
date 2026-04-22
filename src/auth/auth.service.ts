import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthService {
  refresh: any;
  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.db.queryOne(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.user_id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { 
        user_id: user.user_id, 
        username: user.username, 
        role: user.role 
      }
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}