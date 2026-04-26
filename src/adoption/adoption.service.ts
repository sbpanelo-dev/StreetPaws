import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdoptionService {
  constructor(private db: DatabaseService) {}

async createRequest(data: any) {
  console.log('=== CREATE REQUEST DEBUG ===');
  console.log('Raw data:', JSON.stringify(data));
  
  try {
    // Test 1: Check table exists
    const tables = await this.db.query("SHOW TABLES LIKE 'adoption_requests'");
    console.log('Table exists:', tables.length > 0);
    
    // Test 2: Check columns
    const columns = await this.db.query("DESCRIBE adoption_requests");
    console.log('Table columns:', columns.map((c: any) => c.Field));
    
    // Test 3: Test INSERT
    const {
      animal_id,
      full_name,
      email,
      phone,
      address,
      reason,
      experience,
    } = data;

    const values = [animal_id, full_name, email, phone, address || null, reason || null, experience || null, 'Pending'];
    console.log('INSERT values:', values);
    
    const result = await this.db.query(
      `INSERT INTO adoption_requests 
       (animal_id, full_name, email, phone, address, reason, experience, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      values
    );
    
    console.log('INSERT SUCCESS:', result);
    return { message: "Request submitted" };
  } catch (error: any) {
    console.error('=== CREATE ERROR ===');
    console.error('SQL Message:', error.message);
    console.error('SQL Code:', error.code);
    console.error('SQL State:', error.sqlState);
    throw error;
  }
}

  // 🆕 Works with request_id PK + your exact columns
 async findAllRequests() {
  const requests = await this.db.query(`
    SELECT 
      ar.request_id as id,
      ar.user_id,
      COALESCE(u.username, 'Unknown User') as username,
      ar.animal_id,
      COALESCE(a.name, 'No Animal') as animal_name,
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
        ELSE LOWER(ar.status)
      END as status,
      ar.created_at as request_date
    FROM adoption_requests ar
    LEFT JOIN users u ON ar.user_id = u.user_id AND ar.user_id IS NOT NULL
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