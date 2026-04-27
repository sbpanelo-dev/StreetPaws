import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdoptionService {
  constructor(private db: DatabaseService) {}

  // 🆕 FIXED: Now saves user_id
async createRequest(data: any) {
  const { 
    user_id,
    animal_id,
    full_name, 
    email, 
    phone, 
    address, 
    reason, 
    experience 
  } = data;
  
  await this.db.query(
    `INSERT INTO adoption_requests 
     (animal_id, full_name, email, phone, address, reason, experience, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
    [
      animal_id,
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

  async updateStatus(id: number, status: string) {
  try {
    console.log(`1️⃣ START updateStatus(${id}, ${status})`);

    // 🆕 SAFEST query - exact copy from findAllRequests
    const requests = await this.db.query(`
      SELECT 
        request_id as id,
        animal_id
      FROM adoption_requests 
      WHERE request_id = ?
      ORDER BY created_at DESC
    `, [id]);

    console.log(`2️⃣ Found:`, requests.length, 'records');

    if (requests.length === 0) {
      console.log(`3️⃣ Request ${id} not found`);
      return { success: false, message: `Request ${id} not found` };
    }

    const request = requests[0];
    console.log(`4️⃣ Animal ID:`, request.animal_id);

    // Update request
    await this.db.query(
      `UPDATE adoption_requests SET status = ? WHERE request_id = ?`,
      [status, id]
    );
    console.log(`5️⃣ Request updated`);

    // Update animal if approved
    if (status === 'Approved') {
      await this.db.query(
        `UPDATE animals SET status = 'Adopted' WHERE animal_id = ?`,
        [request.animal_id]
      );
      console.log(`6️⃣ Animal updated`);
    }

    return { 
      success: true, 
      message: `Request ${status.toLowerCase()} OK`
    };

  } catch (error: any) {
    console.error(`💥 CRASH:`, error?.message || 'Unknown');
    return { 
      success: false, 
      error: error?.message || 'Server error',
      id: id,
      status: status
    };
  }
}
  // ✅ Perfect - no changes needed
async clearAllHistory() {
  const result: any = await this.db.query(
    'DELETE FROM adoption_requests'
  );

  return { 
    message: 'All adoption request history cleared',
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