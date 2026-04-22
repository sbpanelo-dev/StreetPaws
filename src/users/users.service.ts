import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateUserDto {
  username: string;
  password: string;
  role?: 'Admin' | 'User' | 'Staff';
}

@Injectable()
export class UsersService {
  constructor(private db: DatabaseService) {}

  async create(createUserDto: CreateUserDto) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    const result = await this.db.query(
      `INSERT INTO users (username, password, role) 
       VALUES (?, ?, ?)`,
      [createUserDto.username, hashedPassword, createUserDto.role || 'User']
    );
    return { success: true, userId: result.insertId };
  }

  async findAll() {
    return await this.db.query(
      `SELECT user_id, username, role, created_at FROM users ORDER BY created_at DESC`
    );
  }

  async findOne(id: number) {
    const user = await this.db.queryOne(
      `SELECT user_id, username, role, created_at FROM users WHERE user_id = ?`,
      [id]
    );
    return user ? { success: true, user } : { error: 'User not found' };
  }

  async update(id: number, updateData: Partial<CreateUserDto>) {
    // ✅ Build query safely
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updateData.username) {
      setClauses.push('username = ?');
      values.push(updateData.username);
    }

    if (updateData.role && ['Admin', 'User', 'Staff'].includes(updateData.role)) {
      setClauses.push('role = ?');
      values.push(updateData.role);  // ✅ String ENUM
    }

    if (setClauses.length === 0) {
      return { error: 'No valid fields to update' };
    }

    values.push(id);  // WHERE user_id = ?
    await this.db.query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE user_id = ?`,
      values
    );

    const updatedUser = await this.db.queryOne(
      `SELECT user_id, username, role FROM users WHERE user_id = ?`,
      [id]
    );

    return { success: true, user: updatedUser };
  }

  async remove(id: number) {
    const user = await this.db.queryOne('SELECT * FROM users WHERE user_id = ?', [id]);
    if (!user) return { error: 'User not found' };
    
    await this.db.query('DELETE FROM users WHERE user_id = ?', [id]);
    return { success: true, message: `User ${user.username} deleted` };
  }
}