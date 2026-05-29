package com.jarlink.debugger.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JarFile {
    private String id;
    private String name;
    private long size;
    private String uploadedAt;
    private int scannedClassesCount;
    private String mavenCoordinate;
    private String status; // LOADING, SCANNED, ERROR
}
