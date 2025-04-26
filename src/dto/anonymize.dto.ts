import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for text anonymization requests
 */
export class AnonymizeTextDto {
  @ApiProperty({
    description: 'The text to anonymize',
    example: 'Hello, my name is James Bond and my email is james.bond@007.com',
    required: true,
    maxLength: 2000,
  })
  @IsNotEmpty({ message: 'Text cannot be empty' })
  @IsString({ message: 'Text must be a string' })
  @MaxLength(2000, { message: 'Text cannot exceed 2000 characters' })
  text: string;
}

/** 
 * DTO for text deanonymization requests
 */
export class DeanonymizeTextDto {
  @ApiProperty({
    description: 'The anonymized text to deanonymize',
    example: 'Hello, my name is [PERSON] and my email is [EMAIL]',
    required: true,
    maxLength: 2000,
  })
  @IsNotEmpty({ message: 'Text cannot be empty' })
  @IsString({ message: 'Text must be a string' })
  @MaxLength(2000, { message: 'Text cannot exceed 2000 characters' })
  text: string;

  @ApiProperty({
    description: 'Entity mappings between original and anonymized values',
    example: [
      {
        "original": "James Bond",
        "anonymized": "[PERSON]",
        "entityType": "PERSON",
        "start": 15,
        "end": 25
      },
      {
        "original": "james.bond@007.com",
        "anonymized": "[EMAIL]",
        "entityType": "EMAIL_ADDRESS",
        "start": 39,
        "end": 46
      }
    ],
    required: true,
    type: 'array'
  })
  @IsNotEmpty({ message: 'Entity mappings cannot be empty' })
  entities: Array<{
    original: string;
    anonymized: string;
    entityType: string;
    start: number;
    end: number;
  }>;
}
