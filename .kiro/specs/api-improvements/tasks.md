# Implementation Plan

- [x] 1. Setup foundation and configuration





  - Install new dependencies (zod, winston, uuid, express-rate-limit, swagger packages)
  - Create environment configuration with Zod validation in `src/config/env.ts`
  - Create `.env.example` file with all required and optional variables documented
  - Create logger configuration in `src/config/logger.ts` with Winston
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2. Create error handling infrastructure




  - [x] 2.1 Create custom error classes in `src/errors/index.ts`


    - Implement AppError base class with statusCode and isOperational properties
    - Implement ValidationError, NotFoundError, TimeoutError, InsufficientStorageError classes
    - Export all error classes for use across the application
    - _Requirements: 3.4_
  - [x] 2.2 Create global error handler middleware in `src/middleware/errorHandler.ts`


    - Implement error catching and logging with full context
    - Implement cleanup of temp files on error
    - Implement formatted error responses with appropriate status codes
    - Hide internal details in production environment
    - Include request ID in error responses
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

- [x] 3. Implement request logging and tracking





  - Create request logger middleware in `src/middleware/requestLogger.ts`
  - Add UUID generation for request IDs
  - Log request start with method, path, IP, and user agent
  - Log request completion with status code and duration
  - Attach request ID to req object for use in other middleware
  - _Requirements: 5.1, 5.5_

- [x] 4. Implement rate limiting




  - Create rate limiter middleware in `src/middleware/rateLimiter.ts` using express-rate-limit
  - Configure rate limit from environment variables (window and max requests)
  - Implement custom handler that logs rate limit violations
  - Return 429 status with retry-after header when limit exceeded
  - Include descriptive error message in response
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_







- [x] 5. Enhance file upload security





  - [x] 5.1 Create upload validator middleware in `src/middleware/uploadValidator.ts`

    - Implement MIME type validation against whitelist


    - Configure file size limit from environment variable (50MB default)
    - Configure max files per request from environment variable (10 default)
    - Implement custom file filter that rejects invalid types
    - Generate unique filenames to prevent collisions
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 5.2 Update `src/utils/upload.ts` to use new validation




    - Replace existing multer configuration with validated version
    - Add error handling for upload failures
    - Ensure temp files are tracked for cleanup
    - _Requirements: 1.5_

- [x] 6. Implement request timeout handling





  - Create timeout middleware in `src/middleware/timeout.ts`
  - Configure timeout from environment variable (30s default)
  - Clear timeout on response finish or close
  - Throw TimeoutError when timeout is reached
  - Ensure cleanup happens on timeout
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [-] 7. Improve temp file management


  - [x] 7.1 Enhance `src/utils/tempFileManager.ts` with tracking and periodic cleanup



    - Add Map to track files with metadata (path, createdAt, requestId)
    - Implement add() method to register temp files
    - Implement cleanup() method that accepts optional file paths
    - Implement periodic cleanup of files older than configured age (1 hour default)
    - Add logging for cleanup operations
    - _Requirements: 8.1, 8.2, 8.3, 8.5_
  - [x] 7.2 Create disk space check utility in `src/utils/diskSpace.ts`





    - Implement platform-specific disk space checking (Windows and Unix)
    - Create middleware that checks disk space before file operations
    - Throw InsufficientStorageError when disk usage > 90%
    - Add error handling for disk check failures
    - _Requirements: 8.4_


- [x] 8. Create health check endpoints




  - [x] 8.1 Create health check route in `src/routes/health.ts`


    - Implement GET /health endpoint that checks filesystem access
    - Implement GET /health/ready endpoint for readiness probe
    - Check write access to uploads and output directories
    - Check memory usage (< 90% threshold)
    - Return 200 for healthy, 503 for unhealthy
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  - [x] 8.2 Add version and uptime information to health response


    - Include package.json version in response
    - Include process uptime in response
    - Include timestamp in ISO format
    - Include individual check results
    - _Requirements: 6.4_

- [x] 9. Add API documentation with Swagger




  - [x] 9.1 Setup Swagger configuration in `src/config/swagger.ts`


    - Configure swagger-jsdoc with OpenAPI 3.0 spec
    - Define API info (title, version, description)
    - Define server URLs for different environments
    - Configure to scan route files for JSDoc comments
    - _Requirements: 9.1, 9.2_
  - [x] 9.2 Add Swagger JSDoc comments to existing routes


    - Document /api/convert-image endpoint with parameters and responses
    - Document /api/resize-image endpoint with parameters and responses
    - Document /api/ajust-dpi endpoint with parameters and responses
    - Document /api/pdf-from-images endpoint with parameters and responses
    - Include request/response schemas and examples
    - _Requirements: 9.3, 9.4, 9.5_

- [x] 10. Update application entry point




  - [x] 10.1 Update `src/app.ts` to integrate all new middleware


    - Add environment validation at startup (fail fast if invalid)
    - Add middleware in correct order: logger → rate limiter → timeout → cors → body parser → routes → error handler
    - Register health check routes
    - Register Swagger UI routes at /api-docs
    - Add graceful shutdown handler for cleanup

    - _Requirements: 4.1, 4.2_
  - [x] 10.2 Update existing routes to use new error classes

    - Replace generic errors with ValidationError in convert.ts
    - Replace generic errors with ValidationError in resize.ts
    - Replace generic errors with ValidationError in dpi.ts
    - Ensure all routes properly propagate errors to error handler
    - Remove redundant error handling code from routes
    - _Requirements: 3.1, 3.6_

- [x] 11. Update route implementations for consistency





  - [x] 11.1 Refactor routes to use centralized error handling


    - Remove try-catch blocks that send responses directly
    - Use next(error) to pass errors to error handler
    - Ensure temp files are registered with tempFileManager
    - Remove duplicate error response logic
    - _Requirements: 3.1, 8.1_


  - [x] 11.2 Add timeout handling to image processing operations





    - Wrap Sharp operations with timeout logic
    - Throw TimeoutError when processing exceeds limit
    - Ensure cleanup happens on timeout
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 12. Update package.json and documentation




  - [x] 12.1 Update package.json with new dependencies and scripts


    - Add all new dependencies with correct versions
    - Add test script for Jest
    - Add script to generate Swagger spec
    - Update build script if needed
    - _Requirements: 4.1_


  - [x] 12.2 Update README.md with new features and configuration





    - Document all environment variables
    - Document rate limiting behavior
    - Document health check endpoints
    - Document Swagger UI location
    - Add troubleshooting section
    - _Requirements: 10.2, 10.3, 10.4_

- [ ]* 13. Add tests for new functionality
  - [ ]* 13.1 Create unit tests for validators and utilities
    - Test environment validation with valid and invalid configs
    - Test error classes instantiation and properties
    - Test temp file manager add, cleanup, and periodic cleanup
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ]* 13.2 Create integration tests for middleware
    - Test rate limiter blocks excessive requests
    - Test error handler catches and formats errors correctly
    - Test request logger adds request ID and logs properly
    - Test timeout middleware triggers on long operations
    - Test file upload validator rejects invalid files
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 7.1_
  - [ ]* 13.3 Create E2E tests for critical paths
    - Test successful image upload and processing
    - Test file too large rejection
    - Test rate limit enforcement
    - Test health check endpoints
    - Test timeout on long processing
    - _Requirements: 1.2, 2.1, 6.1, 7.1_
