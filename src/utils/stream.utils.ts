import { Response } from 'express';
import { Logger } from '@nestjs/common';

const logger = new Logger('StreamUtils');

/**
 * Utility class for handling streaming responses
 */
export class StreamUtils {
  /**
   * Streams text in chunks to simulate gradual response delivery
   * @param text The text to stream
   * @param res The Express response object
   * @param chunkSize The size of each chunk (default: 20 characters)
   * @param delayMs The delay between chunks (default: 50ms)
   */
  static async streamText(
    text: string, 
    res: Response, 
    chunkSize: number = 20, 
    delayMs: number = 50
  ): Promise<void> {
    try {
      // Prepare response for SSE if not already set
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
      }
      
      // Split the text into chunks of specified size
      const chunks = text.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || [text];
      
      // Stream each chunk with delay
      for (const chunk of chunks) {
        res.write(`data: ${chunk}\n\n`);
        await StreamUtils.delay(delayMs);
      }
      
      // Signal end of stream
      res.write('data: [DONE]\n\n');
      
    } catch (error) {
      logger.error(`Error streaming text: ${error.message}`, error.stack);
      res.write(`data: Error streaming response: ${error.message}\n\n`);
    }
  }
  
  /**
   * Writes an error to the stream in SSE format
   * @param res The Express response object
   * @param error The error to send
   * @param status HTTP status code (optional)
   */
  static sendStreamError(
    res: Response, 
    error: Error | string, 
    status?: number
  ): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    try {
      if (!res.headersSent) {
        res.status(status || 500);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
      }
      
      res.write(`data: Error: ${errorMessage}\n\n`);
      res.write('data: [DONE]\n\n');
      
    } catch (e) {
      logger.error(`Failed to send stream error: ${e.message}`, e.stack);
    }
  }
  
  /**
   * Simple promise-based delay function
   * @param ms Milliseconds to delay
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
