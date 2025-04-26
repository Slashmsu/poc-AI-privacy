import { Test, TestingModule } from '@nestjs/testing';
import { OpenAiService } from './openai.service';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { StreamUtils } from '../utils/stream.utils';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

describe('OpenAiService', () => {
  let service: OpenAiService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    // Mock config service
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'test-api-key';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAiService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OpenAiService>(OpenAiService);
    
    // Mock implementation of delay method to avoid actual delays in tests
    jest.spyOn(StreamUtils, 'delay').mockImplementation(() => Promise.resolve());
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCompletion', () => {
    it('should throw error when message is empty', async () => {
      await expect(service.getCompletion('')).rejects.toThrow(HttpException);
    });

    it('should return completion from OpenAI', async () => {
      // Setup mock return value
      const mockResult = {
        choices: [
          {
            message: { content: 'Test response' }
          }
        ]
      };
      
      service['openai'].chat.completions.create = jest.fn().mockResolvedValue(mockResult);
      
      const result = await service.getCompletion('Test message');
      expect(result).toBe('Test response');
      expect(service['openai'].chat.completions.create).toHaveBeenCalledWith({
        model: service['defaultModel'],
        messages: [service['systemPrompt'], { role: 'user', content: 'Test message' }],
      });
    });

    it('should handle errors from OpenAI API', async () => {
      // Setup mock to throw error
      const mockError = new Error('API error');
      mockError['status'] = 429;
      
      service['openai'].chat.completions.create = jest.fn().mockRejectedValue(mockError);
      
      await expect(service.getCompletion('Test message')).rejects.toThrow(HttpException);
    });
  });
});
