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
public class Project {
    private String id;
    private String name;
    private String description;
    private String createdAt;
    
    @Builder.Default
    private List<JarFile> jarFiles = new ArrayList<>();
    
    @Builder.Default
    private List<ScannedClass> classes = new ArrayList<>();
    
    @Builder.Default
    private List<EnvVar> envVars = new ArrayList<>();
}
