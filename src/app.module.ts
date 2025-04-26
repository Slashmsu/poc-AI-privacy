import { Module } from '@nestjs/common';
import { ChatController } from './controllers/chat.controller';
import { AnonymizerController } from './controllers/anonymizer.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AnonymizerService } from './services/anonymizer.service';
import { OpenAiService } from './services/openai.service';
import { ChatService } from './services/chat.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // makes it globally available
    HttpModule,
  ],
  controllers: [ChatController, AnonymizerController],
  providers: [AnonymizerService, OpenAiService, ChatService],
})
export class AppModule {}
