import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for chat message requests
 */
export class ChatMessageDto {
  @ApiProperty({
    description: 'The message to send to the AI assistant',
    example: 'Dear M6 Team, My name is James Bond, and my favorite number is 007. I would like to take this opportunity to wish you a Happy New Year 2025. Should you need to reach me, please feel free to contact me at +4915151279346.',
    required: true,
    maxLength: 2000,
  })
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @IsString({ message: 'Message must be a string' })
  @MaxLength(2000, { message: 'Message cannot exceed 2000 characters' })
  message: string;
}
