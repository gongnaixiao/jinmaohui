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
public class JavaParameter {
    private String name;
    private String type;
    
    @Builder.Default
    private List<String> genericTypes = new ArrayList<>();
    
    private boolean isPrimitiveOrSimple;
    
    @Builder.Default
    private List<JavaField> fields = new ArrayList<>();
    
    private Object defaultValue;
}
