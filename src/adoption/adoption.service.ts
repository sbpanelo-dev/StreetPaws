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

  // 🆕 Works with request_id PK + your exact columns
 async findAllRequests() {
  const requests = await this.db.query(`
    SELECT 
      request_id as id,
      animal_id,
      COALESCE(a.name, 'Unknown') as animal_name,
      COALESCE(a.type, 'Unknown') as animal_type,
      full_name,
      email,
      phone,
      address,
      reason,
      experience,
      CASE status
        WHEN 'Pending' THEN 'pending'
        WHEN 'Approved' THEN 'approved'
        WHEN 'Rejected' THEN 'rejected'
      END as status,
      created_at as request_date
    FROM adoption_requests ar
    LEFT JOIN animals a ON ar.animal_id = a.animal_id
    ORDER BY created_at DESC
  `);

  return requests.map(req => ({
    id: req.id,
    user_id: null,
    username: 'User',
    animal_id: req.animal_id,
    animal_name: req.animal_name,
    animal_type: req.animal_type,
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
  // 🆕 Works with request_id + your status enum
async updateStatus(id: number, status: 'Approved' | 'Rejected') {
  const [existing] = await this.db.query(
    'SELECT animal_id FROM adoption_requests WHERE request_id = ?',
    [id]
  );

  if (!existing) {
    throw new NotFoundException('Request not found');
  }

  await this.db.query(
    'UPDATE adoption_requests SET status = ? WHERE request_id = ?',
    [status, id]
  );

  if (status === 'Approved') {
    await this.db.query(
      'UPDATE animals SET status = "Adopted" WHERE animal_id = ?',
      [existing.animal_id]
    );
  }

  return { message: `Request ${status.toLowerCase()} successfully` };
}
}