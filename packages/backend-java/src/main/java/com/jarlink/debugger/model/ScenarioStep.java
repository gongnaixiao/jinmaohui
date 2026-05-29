package com.jarlink.debugger.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScenarioStep {
    private String id;
    private String name;
    private String targetClass;
    private String targetMethod;
    private String argumentsJson;
    
    @Builder.Default
    private List<VariableExtraction> extractedVariables = new ArrayList<>();
    
    @Builder.Default
    private List<AssertionRule> assertions = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VariableExtraction {
        private String jsonPath;
        private String contextKey;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssertionRule {
        private String jsonPath;
        private String operator; // EQUALS, NOT_EQUALS, CONTAINS, GREATER_THAN, LESS_THAN
        private String expectedValue;
    }
}
