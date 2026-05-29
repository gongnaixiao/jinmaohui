package com.jarlink.debugger.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jarlink.debugger.model.JavaParameter;
import com.jarlink.debugger.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiController {

    @Autowired
    private GeminiService geminiService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @SuppressWarnings("unchecked")
    @PostMapping("/generate-mock")
    public ResponseEntity<?> generateMock(@RequestBody Map<String, Object> body) {
        String className = (String) body.get("className");
        String methodName = (String) body.get("methodName");
        List<Map<String, Object>> rawParameters = (List<Map<String, Object>>) body.get("parameters");

        if (!geminiService.isConfigured()) {
            // High fidelity synthetic data fallback if key is missing/placeholder
            Map<String, Object> placeholder = new HashMap<>();
            if (rawParameters != null) {
                for (Map<String, Object> p : rawParameters) {
                    String pName = (String) p.get("name");
                    String pType = (String) p.get("type");
                    Boolean isSimple = (Boolean) p.get("isPrimitiveOrSimple");

                    if (Boolean.TRUE.equals(isSimple)) {
                        if (pType.contains("String")) {
                            placeholder.put(pName, "synthetic_" + pName);
                        } else if (pType.contains("Boolean") || pType.equals("boolean")) {
                            placeholder.put(pName, true);
                        } else {
                            placeholder.put(pName, 42);
                        }
                    } else {
                        Map<String, Object> nested = new HashMap<>();
                        List<Map<String, Object>> fields = (List<Map<String, Object>>) p.get("fields");
                        if (fields != null) {
                            for (Map<String, Object> f : fields) {
                                String fName = (String) f.get("name");
                                String fType = (String) f.get("type");
                                nested.put(fName, fType.contains("String") ? "mock_string" : 100);
                            }
                        }
                        placeholder.put(pName, nested);
                    }
                }
            }
            return ResponseEntity.ok(Map.of("mockArgs", placeholder));
        }

        try {
            String prompt = "Generate complete synthetic mock data values for configuring a test call in our sandbox compiler.\n" +
                    "Class Name: " + className + "\n" +
                    "Method Name: " + methodName + "\n" +
                    "Parameters definition: " + objectMapper.writeValueAsString(rawParameters) + "\n\n" +
                    "Format the mock data response as a single valid JSON key-value object where each root key represents the argument parameter name defined in the list, and maps it to a hyper-realistic value. For custom complex objects, nest the internal fields inside them.\n\n" +
                    "Respond STRICTLY with the raw JSON:";

            String responseText = geminiService.generate(prompt, true);
            Object mockArgs = objectMapper.readValue(responseText, Object.class);
            return ResponseEntity.ok(Map.of("mockArgs", mockArgs));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("mockArgs", Map.of("error", e.getMessage())));
        }
    }

    @PostMapping("/suggest-assertions")
    public ResponseEntity<?> suggestAssertions(@RequestBody Map<String, Object> body) {
        String className = (String) body.get("className");
        String methodName = (String) body.get("methodName");
        String returnType = (String) body.get("returnType");
        Object sampleResponse = body.get("sampleResponse");

        if (!geminiService.isConfigured()) {
            return ResponseEntity.ok(Map.of(
                    "assertions", List.of(
                            Map.of("jsonPath", "$.code", "operator", "EQUALS", "expectedValue", "200"),
                            Map.of("jsonPath", "$.msg", "operator", "CONTAINS", "expectedValue", "SUCCESS")
                    )
            ));
        }

        try {
            String prompt = "Based on the following Java Method returns signature and actual response sample, suggest 2 to 4 key assertion rules:\n" +
                    "Class: " + className + "\n" +
                    "Method: " + methodName + "\n" +
                    "Return Type: " + returnType + "\n" +
                    "Sample Response Content: " + objectMapper.writeValueAsString(sampleResponse) + "\n\n" +
                    "Respond STRICTLY in this JSON format structure (no markdown wrappers):\n" +
                    "{\n" +
                    "  \"assertions\": [\n" +
                    "    { \"jsonPath\": \"$.data.id\", \"operator\": \"EQUALS\" | \"NOT_EQUALS\" | \"CONTAINS\" | \"GREATER_THAN\" | \"LESS_THAN\", \"expectedValue\": \"...\" }\n" +
                    "  ]\n" +
                    "}";

            String responseText = geminiService.generate(prompt, true);
            Object result = objectMapper.readValue(responseText, Object.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("assertions", new ArrayList<>()));
        }
    }
}
