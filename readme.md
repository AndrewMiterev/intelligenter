# Requirements "To run"
1. npm install, may be also;
2. local postgres sql installation (not important where - user: postgres, password: admin, database: intelligenter), can be changed in .env file; 
3. local redis installation: via docker. File docker-compose.yaml attached.

## How to run:
1. itself server: src\server.ts,  node parameters: --require ts-node/register
2. itself scheduler: src\scheduler.ts, same node parameters: --require ts-node/register


# Additional Improvements in the Intelligenter Implementation

This document describes features and architectural decisions that were implemented beyond the basic requirements of the technical specification to enhance the security, reliability, performance, and maintainability of the system.

## 1. Security

- **Helmet.js**: Middleware for automatically setting security headers (XSS filtering, preventing inline scripts, hiding X-Powered-By headers, etc.)
- **Rate Limiting**: Limit of 50 requests per 15 minutes from a single IP address to protect against DDoS and brute-force attacks
- **API Key Authentication**: All API endpoints are protected by mandatory key validation in the `X-API-Key` header
- **Strict Input Validation**: Validation of incoming domain names using the Joi library to prevent injections and handle incorrect data

## 2. Reliability

- **Background Processing**: Lengthy domain analysis is performed asynchronously after immediately responding to the client, preventing timeouts
- **Analysis Locking (Duplicate Prevention)**: Use of `SELECT ... FOR UPDATE` within a transaction ensures that two parallel analyses for the same domain cannot be started
- **Retry Logic**:
    - Automatic retries for requests to VirusTotal via `retry-axios`
    - Custom retry logic with exponential backoff for the Whois service
- **Graceful Degradation**: If external services are unavailable, the system returns mock data, maintaining overall operability

## 3. Performance

- **Multi-Level Caching**: Redis is used as a first-level cache for results with a `completed` status, drastically reducing the load on PostgreSQL
- **Cache Invalidation**: The cache is properly reset when a new analysis is initiated or when an error occurs
- **Batch Processing in Scheduler**: The scheduler updates domains in batches, which is efficient for memory usage and network requests
- **Rate Limiting for External APIs**: Artificial delays between requests in the scheduler to comply with VirusTotal's rate limits

## 4. Monitoring & Audit

- **Structured Logging**: Use of Pino for high-performance, structured logging with context
- **Request Auditing**: All incoming requests are logged to the database (IP, User-Agent, domain), allowing for usage tracking and identification of suspicious activity
- **Health Check Endpoint**: The `/health` endpoint for monitoring systems to check the service's viability

## 5. Code Quality & Architecture

- **Clean Architecture**: Clear separation of layers (Controllers, Services, Models, Middleware, Routes)
- **TypeScript**: Use of static typing to reduce runtime errors and improve code maintainability
- **Configuration via Environment Variables**: All sensitive data and settings are stored in the `.env` file
- **Independent Processes**: The Application and Scheduler run as separate processes, which is a step towards a microservices architecture