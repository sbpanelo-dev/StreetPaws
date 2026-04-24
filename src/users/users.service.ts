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

  // ✅ 1. CREATE
  async create(createUserDto: CreateUserDto) {
    try {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      
      const result = await this.db.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [createUserDto.username, hashedPassword, createUserDto.role || 'User']
      );
      return { success: true, userId: result.insertId };
    } catch (error) {
      console.error('Create user error:', error);
      return { error: 'Failed to create user' };
    }
  }

  // ✅ 2. FIND ALL (MISSING METHOD!)
  async findAll() {
    const users = await this.db.query(
      'SELECT user_id, username, role, created_at FROM users ORDER BY created_at DESC'
    );
    return { success: true, count: users.length, users };
  }

  // ✅ 3. FIND ONE
  async findOne(id: number) {
    const user = await this.db.queryOne(
      'SELECT user_id, username, role, created_at FROM users WHERE user_id = ?',
      [id]
    );
    return user ? { success: true, user } : { error: 'User not found' };
  }

  // ✅ 4. UPDATE
  async update(id: number, updateData: Partial<CreateUserDto>) {
    const updates: string[] = [];
    const values: any[] = [];

    if (updateData.username) {
      updates.push('username = ?');
      values.push(updateData.username);
    }
    if (updateData.role && ['Admin', 'User', 'Staff'].includes(updateData.role)) {
      updates.push('role = ?');
      values.push(updateData.role);
    }

    if (updates.length === 0) {
      return { error: 'No valid fields to update' };
    }

    values.push(id);
    await this.db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
      values
    );

    const updatedUser = await this.db.queryOne(
      'SELECT user_id, username, role FROM users WHERE user_id = ?',
      [id]
    );

    return { success: true, user: updatedUser };
  }

  // ✅ 5. DELETE
  async remove(id: number) {
    const user = await this.db.queryOne('SELECT username FROM users WHERE user_id = ?', [id]);
    if (!user) return { error: 'User not found' };

    await this.db.query('DELETE FROM users WHERE user_id = ?', [id]);
    return { success: true, message: `User ${user.username} deleted` };
  }
}