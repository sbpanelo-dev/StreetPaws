import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdoptionService {
  constructor(private db: DatabaseService) {}

async createRequest(data: any) {
  const { animal_id, full_name, email, phone, address, reason, experience } = data;
  
  await this.db.query(
    `INSERT INTO adoption_requests 
     (animal_id, full_name, email, phone, address, reason, experience, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
    [animal_id, full_name, email, phone, address || null, reason || null, experience || null]
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
        ELSE status
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

    // ✅ FIXED CHECK
    if (!rows || rows.length === 0) {
      throw new NotFoundException('Request not found');
    }

    const request = rows[0]; // ✅ GET FIRST ROW

    await this.db.query(
      'UPDATE adoption_requests SET status = ? WHERE request_id = ?',
      [status, id]
    );

    // ✅ FIXED ACCESS
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
}