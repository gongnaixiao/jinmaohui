package com.jarlink.debugger.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class GeminiService {

    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKeyEnv;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GeminiService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    private String getApiKey() {
        String key = System.getenv("GEMINI_API_KEY");
        if (key == null || key.trim().isEmpty() || key.equals("MY_GEMINI_API_KEY")) {
            key = geminiApiKeyEnv;
        }
        return key;
    }

    public boolean isConfigured() {
        String key = getApiKey();
        return key != null && !key.trim().isEmpty() && !key.equals("MY_GEMINI_API_KEY");
    }

    public String generate(String prompt, boolean requireJson) {
        if (!isConfigured()) {
            throw new IllegalStateException("GEMINI_API_KEY is not configured.");
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + getApiKey();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("User-Agent", "jarlink-spring-boot-client");

        // Format Gemini Request Payload matching API schema
        Map<String, Object> requestBody = new HashMap<>();
        
        Map<String, Object> part = new HashMap<>();
        part.put("text", prompt);

        Map<String, Object> content = new HashMap<>();
        content.put("parts", Collections.singletonList(part));

        requestBody.put("contents", Collections.singletonList(content));

        if (requireJson) {
            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("responseMimeType", "application/json");
            requestBody.put("generationConfig", generationConfig);
        }

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode textNode = root.path("candidates")
                        .path(0)
                        .path("content")
                        .path("parts")
                        .path(0)
                        .path("text");
                return textNode.asText();
            }
        } catch (Exception e) {
            System.err.println("Gemini API REST calling failure: " + e.getMessage());
            throw new RuntimeException("Gemini generation fails: " + e.getMessage(), e);
        }

        return "{}";
    }
}
