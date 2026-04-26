import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdoptionService {
  constructor(private db: DatabaseService) {}

  async createRequest(data: any) {
    const {
      animal_id,
      full_name,
      email,
      phone,
      address,
      reason,
      experience,
    } = data;

    // YOUR EXISTING SCHEMA - just add user_id
    await this.db.query(
      `INSERT INTO adoption_requests
      (animal_id, full_name, email, phone, address, reason, experience, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [animal_id, full_name, email, phone, address || null, reason || null, experience]
    );

    return { message: "Request submitted" };
  }

  // 🆕 Works with request_id PK + your exact columns
  async findAllRequests() {
    const requests = await this.db.query(`
      SELECT 
        ar.request_id as id,
        ar.user_id,
        COALESCE(u.username, 'Unknown') as username,
        ar.animal_id,
        COALESCE(a.name, 'Unknown') as animal_name,
        COALESCE(a.type, 'Unknown') as animal_type,
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
          ELSE ar.status 
        END as status,
        ar.created_at as request_date
      FROM adoption_requests ar
      LEFT JOIN users u ON ar.user_id = u.user_id
      LEFT JOIN animals a ON ar.animal_id = a.animal_id
      ORDER BY ar.created_at DESC
    `);

    return requests;
  }

  // 🆕 Works with request_id + your status enum
  async updateStatus(id: number, status: 'Approved' | 'Rejected') {
    // Check if exists (using request_id)
    const [existing] = await this.db.query(
      'SELECT request_id, animal_id FROM adoption_requests WHERE request_id = ?',
      [id]
    );

    if (!existing) {
      throw new NotFoundException('Adoption request not found');
    }

    // Update using your exact enum values
    await this.db.query(
      'UPDATE adoption_requests SET status = ? WHERE request_id = ?',
      [status, id]
    );

    // If approved, update animal
    if (status === 'Approved') {
      await this.db.query(
        'UPDATE animals SET status = "Adopted" WHERE animal_id = (SELECT animal_id FROM adoption_requests WHERE request_id = ?)',
        [id]
      );
    }

    return { message: `Request ${status.toLowerCase()} successfully`, requestId: id };
  }
}