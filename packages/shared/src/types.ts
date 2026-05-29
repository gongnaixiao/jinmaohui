/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface JavaParameter {
  name: string;
  type: string;          // e.g. "java.lang.String", "com.example.dto.UserQuery", "int"
  genericTypes?: string[]; // e.g. ["java.lang.String"] for List<String>
  isPrimitiveOrSimple: boolean;
  fields?: JavaField[];  // For nested complex objects
  defaultValue?: any;
}

export interface JavaField {
  name: string;
  type: string;
  genericTypes?: string[];
  isPrimitiveOrSimple: boolean;
  fields?: JavaField[]; // Nested fields
  isRequired?: boolean;
}

export interface JavaMethod {
  name: string;
  modifiers: string[];   // ["public", "static"]
  returnType: string;    // "com.example.Result<com.example.UserVO>"
  genericReturnType?: string; // "com.example.UserVO" inside Result<T>
  parameters: JavaParameter[];
  annotation?: string[];  // e.g. ["@PostMapping", "@DubboService"]
  description?: string;
  sampleJson?: string;   // Generated placeholder JSON for calling
}

export interface ScannedClass {
  packageName: string;
  className: string;     // Short name, e.g. "UserService"
  fullyQualifiedName: string; // e.g. "com.company.service.UserService"
  type: "INTERFACE" | "CLASS" | "ENUM";
  annotations: string[]; // ["@Service", "@FeignClient"]
  methods: JavaMethod[];
  sourceCode?: string;   // Optional custom source code if written by user
  isCustom?: boolean;    // true if written in the platform
}

export interface JarFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  scannedClassesCount: number;
  mavenCoordinate?: string; // if imported via maven
  status: "LOADING" | "SCANNED" | "ERROR";
}

export interface EnvVar {
  key: string;
  value: string;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  jarFiles: JarFile[];
  classes: ScannedClass[];
  envVars: EnvVar[];
}

export interface ScenarioStep {
  id: string;
  name: string;
  targetClass: string;   // fullyQualifiedName
  targetMethod: string;  // method name
  argumentsJson: string; // Array of arguments passed [ { ... }, ... ]
  extractedVariables: {
    jsonPath: string;    // e.g. "$.data.token"
    contextKey: string;  // e.g. "authToken"
  }[];
  assertions: {
    jsonPath: string;    // e.g. "$.status"
    operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN";
    expectedValue: string;
  }[];
}

export interface Scenario {
  id: string;
  projectId: string;
  name: string;
  description: string;
  steps: ScenarioStep[];
  createdAt: string;
}

export interface InvokeResult {
  status: "SUCCESS" | "EXCEPTION";
  executionTimeMs: number;
  memoryUsedKb: number;
  returnValue?: any;     // JSON formatted Response
  exceptionMessage?: string;
  stackTrace?: string;
  cpuLoadPercentage?: number;
  threadName?: string;
}

export interface BuildHistoryRecord {
  id: string;
  projectId: string;
  className: string;
  methodName: string;
  invokedAt: string;
  paramJson: string;
  result: InvokeResult;
}

export interface AiMockRequest {
  className: string;
  methodName: string;
  parameters: JavaParameter[];
}

export interface AiAssertionRequest {
  className: string;
  methodName: string;
  returnType: string;
  sampleResponse: any;
}

export interface AiCallChainReport {
  className: string;
  methodName: string;
  calledServices: string[];
  touchedTables: string[];
  complexity: "LOW" | "MEDIUM" | "HIGH";
  performanceBottlenecks: string[];
  optimizations: string[];
}
