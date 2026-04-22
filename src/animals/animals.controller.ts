import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  ParseIntPipe, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DatabaseService } from '../database/database.service';

@Controller('animals')
export class AnimalsController {
  constructor(private db: DatabaseService) {}

  // ✅ 1. List available (Public)
  @Get('available')
  async getAvailableAnimals() {
    const animals = await this.db.query(`
      SELECT animal_id, name, type, breed, age_months, sex, description, status
      FROM animals WHERE status = 'Available' ORDER BY name
    `);
    return { success: true, count: animals.length, animals };
  }

  // ✅ 2. Create animal (Admin)
  @Post()  // ← MISSING THIS!
  @UseGuards(JwtAuthGuard)
  async createAnimal(@Body() animalData: any, @Request() req: any) {
    console.log('📦 CREATE:', animalData);
    
    if (req.user.role !== 'Admin') {
      return { error: 'Admin required' };
    }

    const validTypes = ['Dog', 'Cat', 'Other'];
    const validSex = ['Male', 'Female'];
    
    if (!validTypes.includes(animalData.type)) {
      return { error: `type: ${validTypes.join(', ')}`, received: animalData.type };
    }
    if (!validSex.includes(animalData.sex)) {
      return { error: `sex: ${validSex.join(', ')}`, received: animalData.sex };
    }

    const result = await this.db.query(
      `INSERT INTO animals (name, type, breed, age_months, sex, description, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'Available')`,
      [
        animalData.name,
        animalData.type,
        animalData.breed || null,
        parseInt(animalData.age_months),
        animalData.sex,
        animalData.description || null
      ]
    );

    const newAnimal = await this.db.queryOne(
      'SELECT * FROM animals WHERE animal_id = ?', [result.insertId]
    );

    return { success: true, animalId: result.insertId, animal: newAnimal };
  }

  // ✅ 3. Get single (Public)
  @Get(':id')
  async getAnimal(@Param('id', ParseIntPipe) id: number) {
    const animal = await this.db.queryOne(
      'SELECT * FROM animals WHERE animal_id = ?', [id]
    );
    return animal ? { success: true, animal } : { error: `ID ${id} not found` };
  }

  // ✅ 4. Update (Admin)
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateAnimal(@Param('id', ParseIntPipe) id: number, @Body() updateData: any, @Request() req: any) {
    console.log('🔄 UPDATE:', { id, updateData });
    
    if (req.user.role !== 'Admin') {
      return { error: 'Admin required' };
    }

    const animal = await this.db.queryOne('SELECT * FROM animals WHERE animal_id = ?', [id]);
    if (!animal) return { error: `ID ${id} not found` };

    const updates: string[] = [];
    const values: any[] = [];

    if (updateData.name) { updates.push('name=?'); values.push(updateData.name); }
    if (updateData.type && ['Dog','Cat','Other'].includes(updateData.type)) { updates.push('type=?'); values.push(updateData.type); }
    if (updateData.breed !== undefined) { updates.push('breed=?'); values.push(updateData.breed); }
    if (updateData.age_months !== undefined) { 
      const age = parseInt(updateData.age_months);
      if (!isNaN(age)) { updates.push('age_months=?'); values.push(age); }
    }
    if (updateData.sex && ['Male','Female'].includes(updateData.sex)) { updates.push('sex=?'); values.push(updateData.sex); }
    if (updateData.status && ['Available','Adopted','Fostered','Rescued'].includes(updateData.status)) { updates.push('status=?'); values.push(updateData.status); }
    if (updateData.description !== undefined) { updates.push('description=?'); values.push(updateData.description); }

    if (updates.length === 0) {
      return { error: 'No valid fields', valid: ['name','type','breed','age_months','sex','status','description'] };
    }

    values.push(id);
    await this.db.query(`UPDATE animals SET ${updates.join(',')} WHERE animal_id=?`, values);

    const updated = await this.db.queryOne('SELECT * FROM animals WHERE animal_id=?', [id]);
    return { success: true, message: 'Updated!', animal: updated };
  }

  // ✅ 5. Delete (Admin)
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteAnimal(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    if (req.user.role !== 'Admin') return { error: 'Admin required' };

    const animal = await this.db.queryOne('SELECT name FROM animals WHERE animal_id=?', [id]);
    if (!animal) return { error: `ID ${id} not found` };

    await this.db.query('DELETE FROM animals WHERE animal_id=?', [id]);
    return { success: true, message: `Deleted ${animal.name}` };
  }

  // ✅ 6. Adopt (Any logged-in user)
  @Post(':id/adopt')
  @UseGuards(JwtAuthGuard)
  async adoptAnimal(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const animal = await this.db.queryOne(
      `SELECT * FROM animals WHERE animal_id=? AND status='Available'`, [id]
    );
    if (!animal) return { error: 'Animal not available' };

    const adopterResult = await this.db.query(
      `INSERT INTO adopters (name, contact, address) VALUES (?, ?, ?)`,
      [body.name, body.contact, body.address || null]
    );

    const adopterId = (adopterResult as any).insertId;
    await this.db.query(
      `INSERT INTO adoptions (animal_id, adopter_id, adoption_date) VALUES (?, ?, CURDATE())`,
      [id, adopterId]
    );
    await this.db.query(`UPDATE animals SET status='Adopted' WHERE animal_id=?`, [id]);

    return { success: true, message: `${animal.name} adopted!`, adopterId };
  }
}