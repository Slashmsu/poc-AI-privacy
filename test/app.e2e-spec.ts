import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('ChatController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the same validation pipe as in main.ts
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }));
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/chat (GET)', () => {
    return request(app.getHttpServer())
      .get('/chat')
      .expect(200)
      .expect('Chat service is running!');
  });

  it('/chat (POST) - should reject empty message', () => {
    return request(app.getHttpServer())
      .post('/chat')
      .send({ message: '' })
      .expect(400);
  });

  it('/chat (POST) - should reject invalid payload', () => {
    return request(app.getHttpServer())
      .post('/chat')
      .send({ invalidField: 'test' })
      .expect(400);
  });
});
