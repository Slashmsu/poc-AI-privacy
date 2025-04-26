import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AnonymizerService } from './anonymizer.service';
import { OpenAiService } from './openai.service';
import { StreamUtils } from '../utils/stream.utils';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly anonymizerService: AnonymizerService,
    private readonly openAiService: OpenAiService,
  ) {}

  /**
   * Processes a user chat message with anonymization and OpenAI completion
   */
  async processChat(message: string, res: Response): Promise<void> {
    try {
      if (!message) {
        throw new HttpException('Message is required', HttpStatus.BAD_REQUEST);
      }

      // Log the original message
      this.logger.log(`ORIGINAL TEXT: "${message}"`);

      // Step 1: Anonymize the user message
      const { anonymizedText, entitiesFound } = await this.anonymizerService.anonymizeText(message);
      this.logger.log(`Message ${entitiesFound ? 'contains' : 'does not contain'} sensitive information`);
      
      if (entitiesFound) {
        this.logger.log(`ANONYMIZED TEXT: "${anonymizedText}"`);
        
        // Log the sensitive entities found
        const entities = this.anonymizerService.getSensitiveEntities();
        this.logger.log(`Sensitive entities found: ${JSON.stringify(entities)}`);
      }
      
      // Set up SSE response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      if (!entitiesFound) {
        // No sensitive data found, proceed with normal streaming
        await this.openAiService.streamCompletion(anonymizedText, res);
        return;
      }
      
      // Step 2: Get completion from OpenAI (non-streaming for deanonymization)
      const aiResponse = await this.openAiService.getCompletion(anonymizedText);
      this.logger.log(`OPENAI RESPONSE: "${aiResponse}"`);
      
      // Step 3: Deanonymize the response
      const deanonymizedResponse = this.anonymizerService.deanonymizeText(aiResponse);
      this.logger.log(`DEANONYMIZED RESPONSE: "${deanonymizedResponse}"`);
      
      // Step 4: Stream the deanonymized response
      await StreamUtils.streamText(deanonymizedResponse, res);
      
    } catch (error) {
      this.logger.error(`Error processing chat: ${error.message}`, error.stack);
      
      if (!res.headersSent) {
        res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ 
            message: 'Failed to process chat request', 
            error: error.message 
          });
      } else {
        StreamUtils.sendStreamError(res, error);
        res.end();
      }
    }
  }

  /**
   * Processes a user chat message with anonymization and OpenAI completion
   * Returns the complete response as a string (non-streaming)
   * This method is designed for Swagger testing and other non-streaming use cases
   */
  async processChatSync(message: string): Promise<string> {
    if (!message) {
      throw new HttpException('Message is required', HttpStatus.BAD_REQUEST);
    }

    // Log the original message
    this.logger.log(`ORIGINAL TEXT (SYNC): "${message}"`);

    // Step 1: Anonymize the user message
    const { anonymizedText, entitiesFound } = await this.anonymizerService.anonymizeText(message);
    this.logger.log(`Message ${entitiesFound ? 'contains' : 'does not contain'} sensitive information (SYNC)`);
    
    if (entitiesFound) {
      this.logger.log(`ANONYMIZED TEXT (SYNC): "${anonymizedText}"`);
      
      // Log the sensitive entities found
      const entities = this.anonymizerService.getSensitiveEntities();
      this.logger.log(`Sensitive entities found (SYNC): ${JSON.stringify(entities)}`);
    }
    
    // Step 2: Get completion from OpenAI
    const aiResponse = await this.openAiService.getCompletion(anonymizedText);
    this.logger.log(`OPENAI RESPONSE (SYNC): "${aiResponse}"`);
    
    // Step 3: Deanonymize the response if needed
    let finalResponse = aiResponse;
    if (entitiesFound) {
      finalResponse = this.anonymizerService.deanonymizeText(aiResponse);
      this.logger.log(`DEANONYMIZED RESPONSE (SYNC): "${finalResponse}"`);
    }
    
    return finalResponse;
  }
}
