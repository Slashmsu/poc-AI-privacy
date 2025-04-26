# Secure AI Chat API


## Overview

A privacy-focused AI chat API built with NestJS that ensures sensitive data protection through automatic detection and anonymization. This application showcases modern backend architecture, secure data handling practices, and integration with OpenAI's powerful language models.

## Key Features

- **Privacy-First Architecture**: Automatically detects and anonymizes sensitive data like names, phone numbers, and locations before sending to AI services
- **Real-Time Communication**: Streams AI responses for an interactive chat experience
- **Robust Error Handling**: Gracefully manages service failures and provides meaningful feedback
- **Pluggable Anonymization**: Uses Microsoft Presidio for entity detection with extensible anonymization rules

## API Documentation

### Endpoints

#### Chat Controller

```
GET /chat
```
Health check endpoint to verify the service is running.

```
POST /chat
```
Process a chat message with privacy protection (streaming response).

**Request Body:**
```json
{
  "message": "Your message here"
}
```

**Response:**
Server-Sent Events (SSE) stream with the AI response.

```
POST /chat/sync
```
Process a chat message synchronously (non-streaming, Swagger-friendly).

**Request Body:**
```json
{
  "message": "Your message here"
}
```

**Response:**
```json
{
  "response": "AI assistant reply"
}
```

#### Anonymizer Controller

```
POST /anonymizer/anonymize
```
Directly anonymize text to protect sensitive information.

**Request Body:**
```json
{
  "text": "Text containing sensitive data"
}
```

```
POST /anonymizer/deanonymize
```
Deanonymize previously anonymized text.

**Request Body:**
```json
{
  "text": "Anonymized text",
  "entities": [
    {
      "original": "Original sensitive data",
      "anonymized": "Anonymized placeholder",
      "entityType": "Entity type (e.g., PERSON)",
      "start": 0,
      "end": 10
    }
  ]
}
```

### Swagger Documentation

Swagger UI is available at:
```
http://localhost:3000/api
```

After starting the application, you can access the interactive API documentation through your browser. Swagger provides a user-friendly interface to:
- View all available endpoints
- Test API calls directly from the browser
- See request/response models and examples

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `PRESIDIO_ANALYZER_URL`: URL for Presidio Analyzer (default: http://localhost:5001)
- `PRESIDIO_ANONYMIZER_URL`: URL for Presidio Anonymizer (default: http://localhost:5002)
- `PORT`: Server port (default: 3000)

## Technology Stack

- **Framework**: NestJS (Node.js)
- **AI Integration**: OpenAI API
- **Privacy Tools**: Microsoft Presidio Analyzer and Anonymizer
- **Containerization**: Docker & Docker Compose

## Data Privacy Architecture

```
User Input → Anonymization → AI Processing → Deanonymization → User Response
```

The system maintains a precise mapping between anonymized and original entities to accurately restore context in AI responses.

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose (for Presidio services)
- OpenAI API Key

### Installation

```bash
# Install dependencies
$ npm install

# Create .env file (see .env.example)
$ cp .env.example .env
```

### Running the Application

```bash
# Start Presidio services
$ docker-compose up -d

# Run in development mode
$ npm run start:dev

# Production mode
$ npm run build
$ npm run start:prod
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.
