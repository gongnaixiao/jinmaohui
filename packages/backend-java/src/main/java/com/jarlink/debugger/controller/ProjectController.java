package com.jarlink.debugger.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jarlink.debugger.model.*;
import com.jarlink.debugger.service.DatabaseService;
import com.jarlink.debugger.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "*")
public class ProjectController {

    @Autowired
    private DatabaseService databaseService;

    @Autowired
    private GeminiService geminiService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping
    public List<Project> getProjects() {
        return databaseService.load().getProjects();
    }

    @PostMapping
    public ResponseEntity<?> createProject(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String description = body.get("description");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Project name is required"));
        }

        DatabaseService.DatabaseRoot db = databaseService.load();
        
        Project newProj = Project.builder()
                .id("proj-" + System.currentTimeMillis())
                .name(name)
                .description(description != null ? description : "")
                .createdAt(Instant.now().toString())
                .envVars(List.of(new EnvVar("env.target.host", "localhost:8080", "Target server address")))
                .jarFiles(new ArrayList<>())
                .classes(new ArrayList<>())
                .build();

        db.getProjects().add(newProj);
        databaseService.save(db);
        return ResponseEntity.status(HttpStatus.CREATED).body(newProj);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable String id) {
        DatabaseService.DatabaseRoot db = databaseService.load();
        Optional<Project> fileCheck = db.getProjects().stream().filter(p -> p.getId().equals(id)).findFirst();
        
        if (fileCheck.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        db.setProjects(db.getProjects().stream().filter(p -> !p.getId().equals(id)).collect(Collectors.toList()));
        db.setScenarios(db.getScenarios().stream().filter(s -> !s.getProjectId().equals(id)).collect(Collectors.toList()));
        db.setHistory(db.getHistory().stream().filter(h -> !h.getProjectId().equals(id)).collect(Collectors.toList()));
        
        databaseService.save(db);
        return ResponseEntity.ok(Map.of("message", "Project deleted successfully"));
    }

    @PutMapping("/{id}/env")
    public ResponseEntity<?> updateEnvVars(@PathVariable String id, @RequestBody Map<String, List<EnvVar>> body) {
        DatabaseService.DatabaseRoot db = databaseService.load();
        Optional<Project> projOpt = db.getProjects().stream().filter(p -> p.getId().equals(id)).findFirst();
        
        if (projOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Project not found"));
        }

        Project proj = projOpt.get();
        proj.setEnvVars(body.getOrDefault("envVars", new ArrayList<>()));
        databaseService.save(db);
        return ResponseEntity.ok(proj);
    }

    @PostMapping("/{id}/jars")
    public ResponseEntity<?> addJar(@PathVariable String id, @RequestBody Map<String, String> body) {
        DatabaseService.DatabaseRoot db = databaseService.load();
        Optional<Project> projOpt = db.getProjects().stream().filter(p -> p.getId().equals(id)).findFirst();
        
        if (projOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Project not found"));
        }

        Project proj = projOpt.get();
        String name = body.getOrDefault("name", "custom-package.jar");
        String mavenCoordinate = body.getOrDefault("mavenCoordinate", "");

        JarFile newJar = JarFile.builder()
                .id("jar-" + System.currentTimeMillis())
                .name(name)
                .size(102400)
                .uploadedAt(Instant.now().toString())
                .scannedClassesCount(1)
                .mavenCoordinate(mavenCoordinate)
                .status("SCANNED")
                .build();

        String mockClassName = name.replace(".jar", "").replaceAll("-", "_");
        if (mockClassName.contains("_")) {
            mockClassName = Arrays.stream(mockClassName.split("_"))
                    .map(s -> s.isEmpty() ? "" : Character.toUpperCase(s.charAt(0)) + s.substring(1))
                    .collect(Collectors.joining());
        } else {
            mockClassName = Character.toUpperCase(mockClassName.charAt(0)) + mockClassName.substring(1);
        }

        JavaMethod sampleMethod1 = JavaMethod.builder()
                .name("executeAction")
                .modifiers(List.of("public"))
                .returnType("com.company.generated.ActionResponse")
                .parameters(List.of(
                        JavaParameter.builder()
                                .name("payload")
                                .type("com.company.generated.ActionPayload")
                                .isPrimitiveOrSimple(false)
                                .fields(List.of(
                                        JavaField.builder().name("actionId").type("java.lang.String").isPrimitiveOrSimple(true).isRequired(true).build(),
                                        JavaField.builder().name("score").type("java.lang.Double").isPrimitiveOrSimple(true).build(),
                                        JavaField.builder().name("enabled").type("java.lang.Boolean").isPrimitiveOrSimple(true).build()
                                ))
                                .build()
                ))
                .description("Custom action scan handler derived from imported JAR metadata of " + mockClassName)
                .sampleJson("{\n  \"payload\": {\n    \"actionId\": \"ACT-01\",\n    \"score\": 0.95,\n    \"enabled\": true\n  }\n}")
                .build();

        JavaMethod sampleMethod2 = JavaMethod.builder()
                .name("getStatus")
                .modifiers(List.of("public", "static"))
                .returnType("java.lang.String")
                .description("Fetch health readiness status for local executor thread context.")
                .sampleJson("{}")
                .build();

        ScannedClass mockClass = ScannedClass.builder()
                .packageName("com.company.generated")
                .className(mockClassName)
                .fullyQualifiedName("com.company.generated." + mockClassName)
                .type("CLASS")
                .annotations(List.of("@Service", "@DubboService"))
                .isCustom(false)
                .methods(List.of(sampleMethod1, sampleMethod2))
                .build();

        proj.getJarFiles().add(newJar);
        proj.getClasses().add(mockClass);
        databaseService.save(db);

        return ResponseEntity.ok(Map.of("jar", newJar, "scannedClass", mockClass));
    }

    @PostMapping("/{id}/custom-class")
    public ResponseEntity<?> compileCustomClass(@PathVariable String id, @RequestBody Map<String, String> body) {
        DatabaseService.DatabaseRoot db = databaseService.load();
        Optional<Project> projOpt = db.getProjects().stream().filter(p -> p.getId().equals(id)).findFirst();
        
        if (projOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Project not found"));
        }

        Project proj = projOpt.get();
        String sourceCode = body.get("sourceCode");
        if (sourceCode == null || sourceCode.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Java source code is required"));
        }

        if (geminiService.isConfigured()) {
            try {
                String prompt = "Read this Java Class source code and compile its structure into our JSON metadata schema.\n" +
                        "Java Source:\n" + sourceCode + "\n\n" +
                        "Respond STRICTLY in this JSON format (no markdown blocks, just the raw json objects):\n" +
                        "{\n" +
                        "  \"packageName\": \"...\",\n" +
                        "  \"className\": \"...\",\n" +
                        "  \"fullyQualifiedName\": \"...\",\n" +
                        "  \"type\": \"INTERFACE\" | \"CLASS\" | \"ENUM\",\n" +
                        "  \"annotations\": [\"...\"],\n" +
                        "  \"methods\": [\n" +
                        "    {\n" +
                        "      \"name\": \"...\",\n" +
                        "      \"modifiers\": [\"...\"],\n" +
                        "      \"returnType\": \"...\",\n" +
                        "      \"genericReturnType\": \"...\",\n" +
                        "      \"parameters\": [\n" +
                        "        {\n" +
                        "          \"name\": \"...\",\n" +
                        "          \"type\": \"...\",\n" +
                        "          \"isPrimitiveOrSimple\": true|false,\n" +
                        "          \"fields\": [ {\n" +
                        "             \"name\": \"...\", \"type\": \"...\", \"isPrimitiveOrSimple\": true\n" +
                        "          } ]\n" +
                        "        }\n" +
                        "      ],\n" +
                        "      \"description\": \"...\",\n" +
                        "      \"sampleJson\": \"...\"\n" +
                        "    }\n" +
                        "  ]\n" +
                        "}";

                String genResult = geminiService.generate(prompt, true);
                ScannedClass parsedMeta = objectMapper.readValue(genResult, ScannedClass.class);
                parsedMeta.setSourceCode(sourceCode);
                parsedMeta.setIsCustom(true);

                // Update or append
                proj.getClasses().removeIf(c -> c.getFullyQualifiedName().equals(parsedMeta.getFullyQualifiedName()));
                proj.getClasses().add(parsedMeta);
                databaseService.save(db);
                return ResponseEntity.ok(parsedMeta);
            } catch (Exception e) {
                System.err.println("Gemini Java parser failure, falling back to regex: " + e.getMessage());
            }
        }

        // HEURISTIC REGEX FALLBACK
        try {
            Pattern classPattern = Pattern.compile("(?:public\\s+)?(class|interface|enum)\\s+(\\w+)");
            Matcher classMatcher = classPattern.matcher(sourceCode);
            if (!classMatcher.find()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Source code scanning failed: No public class or interface structure identified."));
            }

            String type = classMatcher.group(1).toUpperCase();
            String className = classMatcher.group(2);

            Pattern pkgPattern = Pattern.compile("package\\s+([\\w\\.]+);");
            Matcher pkgMatcher = pkgPattern.matcher(sourceCode);
            String pkg = pkgMatcher.find() ? pkgMatcher.group(1) : "com.company.sandbox";
            String fqName = pkg + "." + className;

            List<JavaMethod> methods = new ArrayList<>();
            Pattern methodPattern = Pattern.compile("public\\s+([\\w\\<\\>]+)\\s+(\\w+)\\s*\\(([^)]*)\\)");
            Matcher methodMatcher = methodPattern.matcher(sourceCode);

            while (methodMatcher.find()) {
                String returnType = methodMatcher.group(1);
                String name = methodMatcher.group(2);
                String paramsText = methodMatcher.group(3);

                List<JavaParameter> parameters = new ArrayList<>();
                Map<String, Object> sampleArgs = new HashMap<>();

                if (!paramsText.trim().isEmpty()) {
                    String[] parts = paramsText.split(",");
                    for (String p : parts) {
                        String[] words = p.trim().split("\\s+");
                        if (words.length >= 2) {
                            String pType = words[words.length - 2];
                            String pName = words[words.length - 1];
                            boolean isSimple = List.of("String", "int", "long", "double", "boolean", "Integer", "Long", "Double", "Boolean", "BigDecimal")
                                    .stream().anyMatch(pType::contains);

                            parameters.add(JavaParameter.builder()
                                    .name(pName)
                                    .type(pType)
                                    .isPrimitiveOrSimple(isSimple)
                                    .fields(isSimple ? new ArrayList<>() : List.of(
                                            JavaField.builder().name("id").type("java.lang.Long").isPrimitiveOrSimple(true).build(),
                                            JavaField.builder().name("name").type("java.lang.String").isPrimitiveOrSimple(true).build()
                                    ))
                                    .build());

                            sampleArgs.put(pName, isSimple ? (pType.toLowerCase().contains("string") ? "mock_value" : 123) : Map.of("id", 1, "name", "mock_nested"));
                        }
                    }
                }

                methods.add(JavaMethod.builder()
                        .name(name)
                        .modifiers(List.of("public"))
                        .returnType(returnType)
                        .parameters(parameters)
                        .description("Imported JVM compilation method scanner hook for " + name)
                        .sampleJson(objectMapper.writeValueAsString(sampleArgs))
                        .build());
            }

            ScannedClass fallbackClass = ScannedClass.builder()
                    .packageName(pkg)
                    .className(className)
                    .fullyQualifiedName(fqName)
                    .type(type)
                    .annotations(List.of("@Service"))
                    .isCustom(true)
                    .sourceCode(sourceCode)
                    .methods(methods.isEmpty() ? List.of(JavaMethod.builder()
                            .name("testRun")
                            .modifiers(List.of("public"))
                            .returnType("java.lang.String")
                            .description("Scan placeholder diagnostics test method context.")
                            .sampleJson("{}")
                            .build()) : methods)
                    .build();

            proj.getClasses().removeIf(c -> c.getFullyQualifiedName().equals(fqName));
            proj.getClasses().add(fallbackClass);
            databaseService.save(db);

            return ResponseEntity.ok(fallbackClass);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "JVM AST parser compiler crash: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/invoke")
    public ResponseEntity<?> invokeMethod(@PathVariable String id, @RequestBody Map<String, Object> body) {
        DatabaseService.DatabaseRoot db = databaseService.load();
        Optional<Project> projOpt = db.getProjects().stream().filter(p -> p.getId().equals(id)).findFirst();
        
        if (projOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Project not found"));
        }

        Project proj = projOpt.get();
        String className = (String) body.get("className");
        String methodName = (String) body.get("methodName");
        String argumentsJson = (String) body.get("argumentsJson");
        Boolean executeViaAi = (Boolean) body.get("executeViaAi");

        Optional<ScannedClass> targetClassOpt = proj.getClasses().stream().filter(c -> c.getFullyQualifiedName().equals(className)).findFirst();
        if (targetClassOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Target scanned Java class not found in project runtime classpath."));
        }
        ScannedClass targetClass = targetClassOpt.get();

        Optional<JavaMethod> targetMethodOpt = targetClass.getMethods().stream().filter(m -> m.getName().equals(methodName)).findFirst();
        if (targetMethodOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Method context missing."));
        }
        JavaMethod targetMethod = targetMethodOpt.get();

        Object parsedArgs;
        try {
            parsedArgs = objectMapper.readValue(argumentsJson != null ? argumentsJson : "{}", new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            try {
                parsedArgs = objectMapper.readValue(argumentsJson != null ? argumentsJson : "{}", Object.class);
            } catch (Exception ex) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid calling arguments JSON syntax."));
            }
        }

        InvokeResult invokeRes;
        long threadRand = (long) (Math.random() * 100);

        if (geminiService.isConfigured() && (Boolean.TRUE.equals(executeViaAi) || Boolean.TRUE.equals(targetClass.getIsCustom()))) {
            try {
                String runPrompt = "You are our simulated sandboxed JVM Thread Executor reflection system.\n" +
                        "Class Definitions:\n" + (targetClass.getSourceCode() != null ? targetClass.getSourceCode() : objectMapper.writeValueAsString(targetClass)) + "\n\n" +
                        "Target Method: " + targetMethod.getName() + " with returns type " + targetMethod.getReturnType() + "\n" +
                        "Call Input Arguments JSON: " + objectMapper.writeValueAsString(parsedArgs) + "\n\n" +
                        "Respond STRICTLY inside this JSON contract schema:\n" +
                        "{\n" +
                        "  \"status\": \"SUCCESS\" | \"EXCEPTION\",\n" +
                        "  \"executionTimeMs\": number,\n" +
                        "  \"memoryUsedKb\": number,\n" +
                        "  \"returnValue\": <any JSON elements representing successful return>,\n" +
                        "  \"exceptionMessage\": \"...\",\n" +
                        "  \"stackTrace\": \"...\",\n" +
                        "  \"cpuLoadPercentage\": number\n" +
                        "}";

                String aiValue = geminiService.generate(runPrompt, true);
                invokeRes = objectMapper.readValue(aiValue, InvokeResult.class);
                invokeRes.setThreadName("AI-VirtualJVM-Executor-Thread-" + threadRand);

                // Add to history list records
                BuildHistoryRecord historyRecord = BuildHistoryRecord.builder()
                        .id("hist-" + System.currentTimeMillis())
                        .projectId(proj.getId())
                        .className(className)
                        .methodName(methodName)
                        .invokedAt(Instant.now().toString())
                        .paramJson(argumentsJson)
                        .result(invokeRes)
                        .build();

                db.getHistory().add(0, historyRecord);
                databaseService.save(db);

                return ResponseEntity.ok(invokeRes);
            } catch (Exception e) {
                System.err.println("Gemini invoke dynamic model analysis failures: " + e.getMessage());
            }
        }

        // FALLBACK HIGH FIDELITY SIMULATION RULES
        String status = "SUCCESS";
        Object returnValue = null;
        String exceptionMessage = "";
        String stackTrace = "";

        if (className.equals("com.company.service.UserService") && methodName.equals("login")) {
            Map<String, Object> mapArgs = (Map<String, Object>) parsedArgs;
            Map<String, Object> credentials = (Map<String, Object>) mapArgs.get("credentials");
            
            if (credentials == null || !credentials.containsKey("username") || !credentials.containsKey("password")) {
                status = "EXCEPTION";
                exceptionMessage = "java.lang.IllegalArgumentException: Credentials username and password parameters are strictly mandatory.";
                stackTrace = "java.lang.IllegalArgumentException: Credentials username and password parameters are strictly mandatory.\n" +
                        "  at com.company.service.UserServiceImpl.login(UserServiceImpl.java:54)\n" +
                        "  at java.base/java.lang.reflect.Method.invoke(Method.java:580)";
            } else if ("error".equals(credentials.get("password"))) {
                status = "EXCEPTION";
                exceptionMessage = "com.company.exception.AccountLockedException: Maximum invalid credentials sign-in retries exceeded on profile: " + credentials.get("username");
                stackTrace = "com.company.exception.AccountLockedException: Account locked.\n" +
                        "  at com.company.service.UserServiceImpl.login(UserServiceImpl.java:62)";
            } else {
                returnValue = Map.of(
                        "code", 200,
                        "msg", "SUCCESS",
                        "data", Map.of(
                                "id", "admin".equals(credentials.get("username")) ? 48201 : (int)(Math.random() * 5000 + 1000),
                                "username", credentials.get("username"),
                                "email", credentials.get("username") + "@enterprise.io",
                                "status", "ACTIVE",
                                "createdTime", Instant.now().minusSeconds(15 * 86400).toString(),
                                "balance", 8900.50
                        )
                );
            }
        } else if (className.equals("com.company.payment.PaymentGateway") && methodName.equals("createPayment")) {
            Map<String, Object> mapArgs = (Map<String, Object>) parsedArgs;
            Map<String, Object> request = (Map<String, Object>) mapArgs.get("request");
            
            if (request == null || !request.containsKey("userId") || !request.containsKey("orderNo") || !request.containsKey("amount")) {
                status = "EXCEPTION";
                exceptionMessage = "com.company.payment.exception.InvalidPaymentPayloadException: Missing vital entity attributes: client references.";
                stackTrace = "com.company.payment.exception.InvalidPaymentPayloadException: Invalid properties.\n" +
                        "  at com.company.payment.PaymentGatewayImpl.createPayment(PaymentGatewayImpl.java:42)";
            } else {
                returnValue = Map.of(
                        "transactionId", "TX-" + (long)(Math.random() * 9000000000L + 1000000000L),
                        "orderNo", request.get("orderNo"),
                        "amount", request.get("amount"),
                        "currency", "USD",
                        "status", "SUCCESS",
                        "payUrl", "https://checkout.stripe.com/pay/sandbox_" + System.currentTimeMillis()
                );
            }
        } else {
            returnValue = Map.of(
                    "timestamp", System.currentTimeMillis(),
                    "status", "SUCCESS",
                    "classInvoked", className,
                    "methodInvoked", methodName,
                    "executionId", "EXEC-" + UUID.randomUUID().toString().substring(0, 8)
            );
        }

        invokeRes = InvokeResult.builder()
                .status(status)
                .executionTimeMs((long)(Math.random() * 80 + 15))
                .memoryUsedKb((long)(Math.random() * 3000 + 800))
                .cpuLoadPercentage(Math.round((Math.random() * 12 + 0.5) * 100.0) / 100.0)
                .threadName("DubboServerHandler-3000-thread-" + threadRand)
                .returnValue(returnValue)
                .exceptionMessage(exceptionMessage)
                .stackTrace(stackTrace)
                .build();

        // Append to history list logging traces
        BuildHistoryRecord historyRecord = BuildHistoryRecord.builder()
                .id("hist-" + System.currentTimeMillis())
                .projectId(proj.getId())
                .className(className)
                .methodName(methodName)
                .invokedAt(Instant.now().toString())
                .paramJson(argumentsJson)
                .result(invokeRes)
                .build();

        db.getHistory().add(0, historyRecord);
        databaseService.save(db);

        return ResponseEntity.ok(invokeRes);
    }

    @GetMapping("/{id}/history")
    public List<BuildHistoryRecord> getHistory(@PathVariable String id) {
        return databaseService.load().getHistory().stream()
                .filter(h -> h.getProjectId().equals(id))
                .collect(Collectors.toList());
    }
}
