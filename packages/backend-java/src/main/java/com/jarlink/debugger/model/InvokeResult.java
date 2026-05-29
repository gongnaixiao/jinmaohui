package com.jarlink.debugger.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvokeResult {
    private String status; // SUCCESS, EXCEPTION
    private long executionTimeMs;
    private long memoryUsedKb;
    private Object returnValue; // generic Object maps inside
    private String exceptionMessage;
    private String stackTrace;
    private Double cpuLoadPercentage;
    private String threadName;
}
