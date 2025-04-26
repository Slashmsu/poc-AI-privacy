import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import OpenAI from 'openai';
import { StreamUtils } from '../utils/stream.utils';

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private openai: OpenAI;
  private readonly defaultModel = 'gpt-4o-mini';
  private readonly systemPrompt: any = {
    role: 'system',
    content: 'You are a virtual assistant trained to provide accurate, helpful, and courteous responses to a wide range of questions. Your goal is to satisfy user requests by delivering information, advice, and solutions in a clear and understandable manner. Please respond to inquiries concisely, professionally, and adapt your communication style based on the context and user needs. You are trained and developed by LindenTech. More information on www.lindentech.de. Your name is Alfred. You will be always received anonymized data from user and you need to work with it. If in answer you need to use anonymized data, use [PERSON] and other anonymized entities instead of real.'
  };

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      this.logger.error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Gets a completion from OpenAI without streaming
   * @param message User message to process
   * @param model Optional model override
   * @returns The AI assistant's response as a string
   */
  async getCompletion(message: string, model?: string): Promise<string> {
    try {
      if (!message) {
        throw new HttpException('Message cannot be empty', HttpStatus.BAD_REQUEST);
      }
      
      this.logger.log(`Getting completion for message of length: ${message.length}`);
      
      const response = await this.openai.chat.completions.create({
        model: model || this.defaultModel,
        messages: [this.systemPrompt, { role: 'user', content: message }],
      });
      
      const responseContent = response.choices[0]?.message?.content || '';
      this.logger.log(`Got completion of length: ${responseContent.length}`);
      
      return responseContent;
    } catch (error) {
      this.handleOpenAIError(error);
      throw error;
    }
  }

  /**
   * Streams a completion from OpenAI to the client
   * @param message User message to process
   * @param res Express Response object
   * @param model Optional model override
   */
  async streamCompletion(message: string, res: Response, model?: string): Promise<void> {
    try {
      if (!message) {
        throw new HttpException('Message cannot be empty', HttpStatus.BAD_REQUEST);
      }
      
      this.logger.log(`Streaming completion for message of length: ${message.length}`);
      
      // Prepare response headers if not already set
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
      }

      const stream = await this.openai.chat.completions.create({
        model: model || this.defaultModel,
        messages: [this.systemPrompt, { role: 'user', content: message }],
        stream: true,
      });
      
      let accumulatedContent = '';
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          accumulatedContent += content;
          
          // Send just the new content
          res.write(`data: ${content}\n\n`);
          
          // Wait a tiny bit to simulate natural typing
          await StreamUtils.delay(10);
        }
      }
      
      this.logger.log(`Streamed completion of total length: ${accumulatedContent.length}`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      this.logger.error(`Error in OpenAI stream: ${error.message}`, error.stack);
      StreamUtils.sendStreamError(res, error);
    }
  }
  
  /**
   * Handles OpenAI API errors with proper HTTP status codes
   * @param error The error from OpenAI
   * @private
   */
  private handleOpenAIError(error: any): void {
    // Extract the most meaningful error message
    const errorMessage = error.message || 'Unknown error occurred';
    
    // Log the error details
    this.logger.error(`OpenAI API error: ${errorMessage}`, error.stack);
    
    if (error.status === 401) {
      throw new HttpException('Authentication error with AI service', HttpStatus.UNAUTHORIZED);
    }
    
    if (error.status === 429) {
      throw new HttpException('Rate limit exceeded with AI service', HttpStatus.TOO_MANY_REQUESTS);
    }
    
    if (error.status === 500) {
      throw new HttpException('AI service internal error', HttpStatus.BAD_GATEWAY);
    }
    
    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new HttpException('AI service is unavailable', HttpStatus.SERVICE_UNAVAILABLE); 
    }
    
    // Default case
    throw new HttpException(
      `Error processing request: ${errorMessage}`,
      error.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
