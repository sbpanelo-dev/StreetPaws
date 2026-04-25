import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {

    dotenv.config();

    // ✅ Use NestExpressApplication
    const app =
      await NestFactory.create<NestExpressApplication>(AppModule);

    const port = process.env.PORT || 3000;

    app.enableCors();

    // 🖼️ Serve uploaded images
    app.useStaticAssets(
        join(__dirname, '..', 'uploads'),
        {
            prefix: '/uploads/',
        },
    );

    await app.listen(+port);

    console.log(`Server listening on port http://localhost:${port}`);
}

bootstrap();
