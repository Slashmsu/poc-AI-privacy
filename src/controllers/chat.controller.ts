import { Controller, Post, Body, Get, Res, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from '../services/chat.service';
import { ChatMessageDto } from '../dto/chat.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is running' })
  getHello(): string {
    return "Chat service is running!";
  }

  @Post()
  @ApiOperation({ summary: 'Process a chat message with privacy protection' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns a streaming response with the AI assistant reply',
    type: 'string',
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async chat(@Body() chatDto: ChatMessageDto, @Res() res: Response) {
    try {
      // DTO validation will ensure message is not empty
      await this.chatService.processChat(chatDto.message, res);
    } catch (error) {
      this.logger.error(`Error in chat endpoint: ${error.message}`, error.stack);
      
      if (!res.headersSent) {
        res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ 
            message: 'Failed to process chat request', 
            error: error.message 
          });
      } else {
        res.end();
      }
    }
  }

  @Post('sync')
  @ApiOperation({ 
    summary: 'Process a chat message synchronously (non-streaming, Swagger-friendly)',
    description: 'This endpoint is designed for testing in Swagger UI. It returns the full response at once, not as a stream.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the complete AI assistant reply as a JSON object',
    schema: {
      type: 'object',
      properties: {
        response: { 
          type: 'string',
          description: 'The AI assistant reply', 
          example: 'Hello! How can I assist you today?' 
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async chatSync(@Body() chatDto: ChatMessageDto) {
    try {
      // Use the non-streaming version of the service
      const response = await this.chatService.processChatSync(chatDto.message);
      return { response };
    } catch (error) {
      this.logger.error(`Error in chatSync endpoint: ${error.message}`, error.stack);
      throw new HttpException({
        message: 'Failed to process chat request',
        error: error.message
      }, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
