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
public class Scenario {
    private String id;
    private String projectId;
    private String name;
    private String description;
    
    @Builder.Default
    private List<ScenarioStep> steps = new ArrayList<>();
    
    private String createdAt;
}
