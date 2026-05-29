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
public class JavaMethod {
    private String name;
    
    @Builder.Default
    private List<String> modifiers = new ArrayList<>();
    
    private String returnType;
    private String genericReturnType;
    
    @Builder.Default
    private List<JavaParameter> parameters = new ArrayList<>();
    
    @Builder.Default
    private List<String> annotation = new ArrayList<>();
    
    private String description;
    private String sampleJson;
}
