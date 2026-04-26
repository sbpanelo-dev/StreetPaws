// src/adoption/adoption.service.ts
import { Injectable } from '@nestjs/common';
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

    await this.db.query(
      `INSERT INTO adoption_requests
      (animal_id, full_name, email, phone, address, reason, experience)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [animal_id, full_name, email, phone, address, reason, experience]
    );

    return { message: "Request submitted" };
  }
}