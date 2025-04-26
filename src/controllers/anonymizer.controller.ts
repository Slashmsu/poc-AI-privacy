import { Controller, Post, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AnonymizeTextDto, DeanonymizeTextDto } from '../dto/anonymize.dto';
import { AnonymizerService } from '../services/anonymizer.service';

/**
 * Controller for direct anonymization/deanonymization operations
 */
@ApiTags('anonymizer')
@Controller('anonymizer')
export class AnonymizerController {
  private readonly logger = new Logger(AnonymizerController.name);

  constructor(private readonly anonymizerService: AnonymizerService) {}

  @Post('anonymize')
  @ApiOperation({ summary: 'Anonymize text to protect sensitive information' })
  @ApiResponse({
    status: 200,
    description: 'Returns the anonymized text and info about sensitive entities found',
    schema: {
      type: 'object',
      properties: {
        anonymizedText: { type: 'string' },
        entitiesFound: { type: 'boolean' },
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              original: { type: 'string' },
              anonymized: { type: 'string' },
              entityType: { type: 'string' },
              start: { type: 'number' },
              end: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async anonymizeText(@Body() anonymizeDto: AnonymizeTextDto) {
    try {
      const { text } = anonymizeDto;
      
      // Log the request
      this.logger.log(`Anonymizing text of length: ${text.length}`);
      
      // Process the text
      const { anonymizedText, entitiesFound } = await this.anonymizerService.anonymizeText(text);
      
      // Get the sensitive entities if any were found
      const entities = entitiesFound ? this.anonymizerService.getSensitiveEntities() : [];
      
      // Return the response
      return {
        anonymizedText,
        entitiesFound,
        entities
      };
    } catch (error) {
      this.logger.error(`Error anonymizing text: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to anonymize text: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('deanonymize')
  @ApiOperation({ summary: 'Deanonymize previously anonymized text' })
  @ApiResponse({
    status: 200,
    description: 'Returns the deanonymized text with original sensitive information restored',
    schema: {
      type: 'object',
      properties: {
        deanonymizedText: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input or missing entity mapping' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deanonymizeText(@Body() deanonymizeDto: DeanonymizeTextDto) {
    try {
      const { text, entities } = deanonymizeDto;
      
      // Log the request
      this.logger.log(`Deanonymizing text of length: ${text.length} with ${entities.length} entity mappings`);
      
      // Check if there are entity mappings
      if (!entities || entities.length === 0) {
        throw new HttpException(
          'Entity mappings are required for deanonymization',
          HttpStatus.BAD_REQUEST
        );
      }
      
      // Create a custom deanonymizer function that uses the provided entities
      const deanonymizedText = this.deanonymizeWithProvidedEntities(text, entities);
      
      // Return the response
      return {
        deanonymizedText
      };
    } catch (error) {
      this.logger.error(`Error deanonymizing text: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to deanonymize text: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  /**
   * Custom deanonymization logic that uses provided entity mappings
   * rather than relying on service state
   */
  private deanonymizeWithProvidedEntities(anonymizedText: string, entities: Array<any>): string {
    if (entities.length === 0) {
      return anonymizedText; // No entities to deanonymize
    }
    
    let result = anonymizedText;
    
    // First, convert the entities to an array and sort by anonymized string length (descending)
    // This ensures longer tokens are replaced first to avoid partial replacements
    const sortedEntities = [...entities]
      .sort((a, b) => b.anonymized.length - a.anonymized.length);
    
    for (const entity of sortedEntities) {
      // Create a regex that can match the anonymized value precisely
      const escapedAnonymized = entity.anonymized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedAnonymized, 'g');
      
      // Replace all occurrences
      result = result.replace(regex, entity.original);
    }
    
    return result;
  }
}
