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
  UseInterceptors,
  UploadedFile,
  Request 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DatabaseService } from '../database/database.service';

@Controller('animals')
export class AnimalsController {
  constructor(private db: DatabaseService) {}

@Post('upload')
@UseGuards(JwtAuthGuard)
@UseInterceptors(
  FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueName =
          Date.now() +
          '-' +
          Math.round(Math.random() * 1e9) +
          extname(file.originalname);

        cb(null, uniqueName);
      },
    }),
  }),
)
async uploadImage(@UploadedFile() file: Express.Multer.File) {
  if (!file) {
    return { error: 'No file uploaded' };
  }

  return {
    photo: `/uploads/${file.filename}`,
  };
}


  // ✅ 1. List available (Public)
  @Get()
async getAllAnimals() {
  const animals = await this.db.query(`
    SELECT animal_id, name, type, breed, age_months, sex, description, status,photo
    FROM animals
    ORDER BY animal_id DESC
  `);

  return animals; // 🔥 IMPORTANT: array lang
}

  // ✅ 2. Create animal (Admin)
@Post()
@UseGuards(JwtAuthGuard)
async createAnimal(@Body() animalData: any, @Request() req: any) {
  if (req.user.role !== 'Admin') {
    return { error: 'Admin required' };
  }

  try {
  const result: any = await this.db.query(`
    INSERT INTO animals (name, type, breed, age_months, sex, description, status,photo)
    VALUES (?, ?, ?, ?, ?, ?, 'Available', ?)
  `, [
    animalData.name,
    animalData.type,
    animalData.breed,
    animalData.age_months,
    animalData.sex,
    animalData.description,
    animalData.photo
  ]);

  console.log("✅ INSERT RESULT:", result);

  return result;

} catch (err) {
  console.error("❌ INSERT ERROR:", err);
  throw err;
}
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
async adoptAnimal(@Param('id') id: string, @Body() body: any) {
  try {
    if (!body.name || !body.contact) {
      return { error: 'Name and contact required' };
    }

    // ✅ FIX 1: Check existing adoption
    const existing = await this.db.queryOne(
      `SELECT 1 FROM adoptions WHERE animal_id=?`, [id]
    );
    if (existing) return { error: 'Animal already adopted' };

    // ✅ FIX 2: Get FULL animal object
    const animal = await this.db.queryOne(
      `SELECT * FROM animals WHERE animal_id=? AND status='Available'`, [id]
    );
    if (!animal) {
      return { error: 'Animal not available' };
    }

    // ✅ FIX 3: Safe adopter insert
    const adopterResult = await this.db.query(
      `INSERT INTO adopters (name, contact, address) VALUES (?, ?, ?)`,
      [body.name, body.contact, body.address || '']
    );
    
    const adopterId = adopterResult.insertId;
    
    await this.db.query(
      `INSERT INTO adoptions (animal_id, adopter_id, adoption_date) VALUES (?, ?, CURDATE())`,
      [id, adopterId]
    );
    
    await this.db.query(`UPDATE animals SET status='Adopted' WHERE animal_id=?`, [id]);

    return { 
      success: true, 
      message: `${animal.name} adopted by ${body.name}!`,
      animalId: parseInt(id),
      adopterId 
    };
  } catch (error: any) {
    console.error('Adopt error:', error);
    return { error: error.message };
  }
}
}