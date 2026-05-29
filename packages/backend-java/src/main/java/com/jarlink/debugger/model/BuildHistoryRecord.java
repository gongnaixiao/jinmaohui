package com.jarlink.debugger.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BuildHistoryRecord {
    private String id;
    private String projectId;
    private String className;
    private String methodName;
    private String invokedAt;
    private String paramJson;
    private InvokeResult result;
}
