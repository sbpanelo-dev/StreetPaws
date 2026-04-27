import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdoptionService {
  constructor(private db: DatabaseService) {}

  // 🆕 FIXED: Now saves user_id
  async createRequest(data: any) {
    const { 
      animal_id, 
      user_id,  // 🆕 Added
      full_name, 
      email, 
      phone, 
      address, 
      reason, 
      experience 
    } = data;
    
    await this.db.query(
      `INSERT INTO adoption_requests 
       (animal_id, user_id, full_name, email, phone, address, reason, experience, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        animal_id, 
        user_id,  // 🆕 Save user_id
        full_name, 
        email, 
        phone, 
        address || null, 
        reason || null, 
        experience || null
      ]
    );
    
    return { message: "Request submitted" };
  }

  async findAllRequests() {
    const requests = await this.db.query(`
      SELECT 
        request_id as id,
        animal_id,
        full_name,
        email,
        phone,
        address,
        reason,
        experience,
        CASE 
          WHEN status = 'Pending' THEN 'pending'
          WHEN status = 'Approved' THEN 'approved'
          WHEN status = 'Rejected' THEN 'rejected'
          ELSE LOWER(status)
        END as status,
        created_at as request_date
      FROM adoption_requests
      ORDER BY created_at DESC
    `);

    return requests.map((req: any) => ({
      id: req.id,
      user_id: null,
      username: 'User',
      animal_id: req.animal_id,
      animal_name: 'Animal ' + req.animal_id,
      animal_type: 'Pet',
      full_name: req.full_name,
      email: req.email,
      phone: req.phone,
      address: req.address,
      reason: req.reason,
      experience: req.experience,
      request_date: req.request_date,
      status: req.status
    }));
  }

  async updateStatus(id: number, status: 'Approved' | 'Rejected') {
    try {
      const [rows]: any = await this.db.query(
        'SELECT animal_id FROM adoption_requests WHERE request_id = ?',
        [id]
      );

      if (!rows || rows.length === 0) {
        throw new NotFoundException('Request not found');
      }

      const request = rows[0];

      await this.db.query(
        'UPDATE adoption_requests SET status = ? WHERE request_id = ?',
        [status, id]
      );

      if (status === 'Approved') {
        await this.db.query(
          'UPDATE animals SET status = ? WHERE animal_id = ?',
          ['Adopted', request.animal_id]
        );
      }

      return { message: `Request ${status.toLowerCase()} successfully` };
    } catch (error) {
      console.error("🔥 UPDATE STATUS ERROR:", error);
      throw error;
    }
  }

  // 🆕 FIXED: Consistent status formatting
  async findUserRequests(userId: number) {
    const requests = await this.db.query(`
      SELECT 
        ar.request_id as id,
        ar.animal_id,
        a.name as animal_name,
        ar.full_name,
        ar.email,
        ar.phone,
        ar.address,
        ar.reason,
        ar.experience,
        CASE 
          WHEN ar.status = 'Pending' THEN 'pending'
          WHEN ar.status = 'Approved' THEN 'approved'
          WHEN ar.status = 'Rejected' THEN 'rejected'
          ELSE LOWER(ar.status)
        END as status,  -- 🆕 Fixed status formatting
        ar.created_at as request_date
      FROM adoption_requests ar
      LEFT JOIN animals a ON ar.animal_id = a.animal_id  -- 🆕 LEFT JOIN (safer)
      WHERE ar.user_id = ?
      ORDER BY ar.created_at DESC
    `, [userId]);

    // 🆕 Map to match frontend interface
    return requests.map((req: any) => ({
      id: req.id,
      animal_id: req.animal_id,
      animal_name: req.animal_name || `Animal ${req.animal_id}`,
      full_name: req.full_name,
      email: req.email,
      phone: req.phone,
      address: req.address,
      reason: req.reason,
      experience: req.experience,
      request_date: req.request_date,
      status: req.status
    }));
  }

  // ✅ Perfect - no changes needed
  async clearUserHistory(userId: number) {
    const [existingRequests]: any = await this.db.query(
      'SELECT COUNT(*) as count FROM adoption_requests WHERE user_id = ?',
      [userId]
    );

    if (existingRequests[0].count === 0) {
      return { message: 'No requests to clear', cleared: 0 };
    }

    const result = await this.db.query(
      'DELETE FROM adoption_requests WHERE user_id = ?',
      [userId]
    );

    return { 
      message: 'User request history cleared successfully',
      cleared: result.affectedRows 
    };
  }

  async getUserRequestCount(userId: number, status: string = 'Pending') {
    const [count]: any = await this.db.query(
      'SELECT COUNT(*) as count FROM adoption_requests WHERE user_id = ? AND status = ?',
      [userId, status]
    );
    return count[0].count;
  }
}