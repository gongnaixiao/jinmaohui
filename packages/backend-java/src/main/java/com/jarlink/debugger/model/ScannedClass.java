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
public class ScannedClass {
    private String packageName;
    private String className;
    private String fullyQualifiedName;
    private String type; // INTERFACE, CLASS, ENUM
    
    @Builder.Default
    private List<String> annotations = new ArrayList<>();
    
    @Builder.Default
    private List<JavaMethod> methods = new ArrayList<>();
    
    private String sourceCode;
    private Boolean isCustom;
}
