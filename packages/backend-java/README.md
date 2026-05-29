# JarLink JVM API Debugger — Spring Boot Backend

This package contains the fully realized, enterprise-grade **Java Technology Stack** backend for the JarLink JVM API Debugger application.

## Technologies Used
- **Java 17**
- **Spring Boot 3.2.5** (Spring MVC Web)
- **Lombok** (Boilerplate-free classes)
- **Jackson Databind** (High-fidelity JSON payloads parsing)
- **Gemini API Integrations** (Mocking and assertion suggestions)

## Getting Started

### Prerequisites
- JDK 17 or higher installed on your local host system.
- Maven 3.8+ installed.

### Run in Development
To boot the Spring Boot server (running on port `8080`):

```bash
cd packages/backend-java
mvn clean spring-boot:run
```

Once running, the Node.js Express server (`server.ts` at workspace root) will automatically detect it and proxy all `/api/*` traffic directly to the Spring Boot JVM server!

## Architecture
- `com.jarlink.debugger.JarLinkApplication`: Main application context bootstrap.
- `com.jarlink.debugger.model`: Domain classes mimicking the system schemas (`Project`, `ScannedClass`, `Scenario`, `BuildHistoryRecord`, etc.).
- `com.jarlink.debugger.service.DatabaseService`: Core reader/writer synchronizing state directly on the project's root database file (`project_db.json`).
- `com.jarlink.debugger.service.GeminiService`: Formats and makes standard HTTPS REST calls to Google's official Gemini AI endpoints securely.
- `com.jarlink.debugger.controller.ProjectController`: Direct REST mappings for classpath assets, compilers, and invoking commands.
- `com.jarlink.debugger.controller.ScenarioController`: Handles testing suite orchestrations and sequential steps assert logs evaluation.
- `com.jarlink.debugger.controller.AiController`: Standard mocks generators and AI trace assertions advisors.
