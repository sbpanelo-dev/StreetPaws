import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import mysql from 'mysql2/promise';


@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private connection!: mysql.Connection;

  async onModuleInit() {
    this.connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'mysql-2dd2d9e5-gbox-e4d9.g.aivencloud.com',
      port: parseInt(process.env.DB_PORT || '13767'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'street_paws_naga',  // ✅ Your DB!
      charset: 'utf8mb4',
    });
    console.log('✅ Connected to street_paws_naga database!');
  }

  async onModuleDestroy() {
    await this.connection.end();
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    const [rows] = await this.connection.execute(sql, params) as [any[], any[]];
    return rows;
  }

  async queryOne(sql: string, params: any[] = []): Promise<any> {
    const [rows] = await this.connection.execute(sql, params) as [any[], any[]];
    return rows[0] || null;
  }
}