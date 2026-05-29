/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Smart proxy to Spring Boot Java Stack if present
let isJavaBackendActive = false;
async function probeJavaBackend() {
  try {
    const res = await fetch("http://127.0.0.1:8080/api/projects", { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      if (!isJavaBackendActive) {
        console.log("🟢 [Java Engine Detect] Java Spring Boot Backend detected online at http://localhost:8080. Automatically routing all API traffic to Java stack.");
      }
      isJavaBackendActive = true;
    } else {
      isJavaBackendActive = false;
    }
  } catch (err) {
    if (isJavaBackendActive) {
      console.log("🔴 [Java Engine Offline] Java Spring Boot Backend Went Offline. Falling back to built-in virtual Node.js simulated VM engine.");
    }
    isJavaBackendActive = false;
  }
}
probeJavaBackend();
setInterval(probeJavaBackend, 6000);

app.use(async (req, res, next) => {
  if (isJavaBackendActive && req.path.startsWith("/api")) {
    try {
      const url = `http://127.0.0.1:8080${req.originalUrl}`;
      const headers: Record<string, string> = {};
      const excludedHeaders = ["host", "connection", "keep-alive", "content-length", "transfer-encoding"];
      for (const [key, val] of Object.entries(req.headers)) {
        if (typeof val === "string" && !excludedHeaders.includes(key.toLowerCase())) {
          headers[key] = val;
        }
      }
      
      const fetchOpts: RequestInit = {
        method: req.method,
        headers,
      };
      
      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
        fetchOpts.body = JSON.stringify(req.body);
        headers["content-type"] = "application/json";
      }
      
      const targetRes = await fetch(url, fetchOpts);
      res.status(targetRes.status);
      for (const [key, val] of targetRes.headers.entries()) {
        res.setHeader(key, val);
      }
      
      const bodyText = await targetRes.text();
      res.send(bodyText);
      return;
    } catch (err) {
      console.error("Failed proxying to java backend:", err);
    }
  }
  next();
});


// Initialize Gemini API client lazily to avoid startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      console.log("Successfully initialized GoogleGenAI server-side client.");
    } else {
      console.warn("GEMINI_API_KEY is not configured or left as placeholder, running in high-fidelity mock fallback mode.");
    }
  }
  return aiClient;
}

// Locate local JSON database
const DB_FILE = path.join(process.cwd(), "project_db.json");

// Helper structure to bootstrap DB with realistic enterprise records
const BOOTSTRAP_DATA = {
  projects: [
    {
      id: "proj-1",
      name: "Spring Boot Microservice Platform",
      description: "Enterprise JVM API core platform scanning and testing suite, featuring UserService, PaymentGateway, and OrderService SDK integrations.",
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      envVars: [
        { key: "auth.gateway.host", value: "https://gateway.prod.com" },
        { key: "billing.gateway.token", value: "tok_enterprise_99bcde102" },
        { key: "user.cache.ttl", value: "3600" }
      ],
      jarFiles: [
        {
          id: "jar-1",
          name: "user-service-sdk-2.1.0.jar",
          size: 1458220,
          uploadedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
          scannedClassesCount: 1,
          mavenCoordinate: "com.company.service:user-service-sdk:2.1.0",
          status: "SCANNED"
        },
        {
          id: "jar-2",
          name: "payment-gateway-sdk-1.3.0.jar",
          size: 784010,
          uploadedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          scannedClassesCount: 1,
          mavenCoordinate: "com.company.payment:payment-gateway-sdk:1.3.0",
          status: "SCANNED"
        }
      ],
      classes: [
        {
          packageName: "com.company.service",
          className: "UserService",
          fullyQualifiedName: "com.company.service.UserService",
          type: "INTERFACE",
          annotations: ["@Service", "@DubboService(version = \"2.1.0\")"],
          isCustom: false,
          methods: [
            {
              name: "login",
              modifiers: ["public"],
              returnType: "com.company.service.Result<com.company.service.UserVO>",
              genericReturnType: "com.company.service.UserVO",
              parameters: [
                {
                  name: "credentials",
                  type: "com.company.service.LoginDTO",
                  isPrimitiveOrSimple: false,
                  fields: [
                    { name: "username", type: "java.lang.String", isPrimitiveOrSimple: true, isRequired: true },
                    { name: "password", type: "java.lang.String", isPrimitiveOrSimple: true, isRequired: true },
                    { name: "appId", type: "java.lang.Integer", isPrimitiveOrSimple: true, isRequired: false }
                  ]
                }
              ],
              description: "Authenticate microservice request credentials, resolve permissions matrix, and compile active user context.",
              sampleJson: JSON.stringify({
                credentials: {
                  username: "admin",
                  password: "password123",
                  appId: 1001
                }
              }, null, 2)
            },
            {
              name: "queryUserById",
              modifiers: ["public"],
              returnType: "com.company.service.Result<com.company.service.UserVO>",
              genericReturnType: "com.company.service.UserVO",
              parameters: [
                {
                  name: "userId",
                  type: "java.lang.Long",
                  isPrimitiveOrSimple: true
                }
              ],
              description: "Retrieve complete profile information for a registered internal or customer ID.",
              sampleJson: JSON.stringify({
                userId: 48201
              }, null, 2)
            }
          ]
        },
        {
          packageName: "com.company.payment",
          className: "PaymentGateway",
          fullyQualifiedName: "com.company.payment.PaymentGateway",
          type: "CLASS",
          annotations: ["@Component", "@FeignClient(name = \"payment-service\")"],
          isCustom: false,
          methods: [
            {
              name: "createPayment",
              modifiers: ["public"],
              returnType: "com.company.payment.PaymentResponse",
              parameters: [
                {
                  name: "request",
                  type: "com.company.payment.PaymentRequest",
                  isPrimitiveOrSimple: false,
                  fields: [
                    { name: "userId", type: "java.lang.Long", isPrimitiveOrSimple: true, isRequired: true },
                    { name: "orderNo", type: "java.lang.String", isPrimitiveOrSimple: true, isRequired: true },
                    { name: "amount", type: "java.math.BigDecimal", isPrimitiveOrSimple: true, isRequired: true },
                    { name: "channel", type: "java.lang.String", isPrimitiveOrSimple: true, isRequired: false }
                  ]
                }
              ],
              description: "Initiate settlement on an order, registering an external gateway reference.",
              sampleJson: JSON.stringify({
                request: {
                  userId: 48201,
                  orderNo: "ORD-2026-98715",
                  amount: 199.50,
                  channel: "STRIPE"
                }
              }, null, 2)
            }
          ]
        }
      ]
    }
  ],
  scenarios: [
    {
      id: "scen-1",
      projectId: "proj-1",
      name: "Authorized Order Booking Check",
      description: "Multi-service workflow verifying that logging in returns a active profile, which can then be used to settle payments.",
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      steps: [
        {
          id: "step-1",
          name: "Step 1: Sign in as admin",
          targetClass: "com.company.service.UserService",
          targetMethod: "login",
          argumentsJson: JSON.stringify({
            credentials: {
              username: "admin",
              password: "password123",
              appId: 1001
            }
          }, null, 2),
          extractedVariables: [
            { jsonPath: "$.data.id", contextKey: "sessionUserId" },
            { jsonPath: "$.data.username", contextKey: "sessionUsername" }
          ],
          assertions: [
            { jsonPath: "$.code", operator: "EQUALS", expectedValue: "200" },
            { jsonPath: "$.msg", operator: "EQUALS", expectedValue: "SUCCESS" }
          ]
        },
        {
          id: "step-2",
          name: "Step 2: Initialize order settlement",
          targetClass: "com.company.payment.PaymentGateway",
          targetMethod: "createPayment",
          argumentsJson: JSON.stringify({
            request: {
              userId: "${sessionUserId}",
              orderNo: "ORD-SCENARIO-99",
              amount: 250.00,
              channel: "WECHAT"
            }
          }, null, 2),
          extractedVariables: [
            { jsonPath: "$.transactionId", contextKey: "lastTxId" },
            { jsonPath: "$.status", contextKey: "txStatus" }
          ],
          assertions: [
            { jsonPath: "$.status", operator: "EQUALS", expectedValue: "SUCCESS" }
          ]
        }
      ]
    }
  ],
  history: [
    {
      id: "hist-1",
      projectId: "proj-1",
      className: "com.company.service.UserService",
      methodName: "login",
      invokedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      paramJson: JSON.stringify({
        credentials: {
          username: "admin",
          password: "password123",
          appId: 1001
        }
      }),
      result: {
        status: "SUCCESS",
        executionTimeMs: 142,
        memoryUsedKb: 1240,
        returnValue: {
          code: 200,
          msg: "SUCCESS",
          data: {
            id: 48201,
            username: "admin",
            email: "admin@company.com",
            status: "ACTIVE",
            createdTime: "2026-01-10T12:00:00Z",
            balance: 14500.50
          }
        },
        cpuLoadPercentage: 8.5,
        threadName: "DubboServerHandler-10.244.1.15:20880-thread-4"
      }
    }
  ]
};

// Database utility functions
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(raw);
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(BOOTSTRAP_DATA, null, 2), "utf-8");
      return BOOTSTRAP_DATA;
    }
  } catch (err) {
    console.error("Failed loading database, falling back to bootstrap:", err);
    return BOOTSTRAP_DATA;
  }
}

function saveDatabase(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed writing static database update:", err);
  }
}

// REST Endpoints for Projects
app.get("/api/projects", (req, res) => {
  const db = loadDatabase();
  res.json(db.projects);
});

app.post("/api/projects", (req, res) => {
  const db = loadDatabase();
  const { name, description } = req.body;
  if (!name) {
    res.status(400).json({ error: "Project name is required" });
    return;
  }
  const newProj = {
    id: "proj-" + Date.now(),
    name,
    description: description || "",
    createdAt: new Date().toISOString(),
    envVars: [
      { key: "env.target.host", value: "localhost:8080" }
    ],
    jarFiles: [],
    classes: []
  };
  db.projects.push(newProj);
  saveDatabase(db);
  res.status(201).json(newProj);
});

app.delete("/api/projects/:id", (req, res) => {
  const db = loadDatabase();
  const index = db.projects.findIndex((p: any) => p.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  db.projects.splice(index, 1);
  // Clean up scenarios & history connected
  db.scenarios = db.scenarios.filter((s: any) => s.projectId !== req.params.id);
  db.history = db.history.filter((h: any) => h.projectId !== req.params.id);
  saveDatabase(db);
  res.json({ message: "Project deleted successfully" });
});

// Update project environment variables
app.put("/api/projects/:id/env", (req, res) => {
  const db = loadDatabase();
  const proj = db.projects.find((p: any) => p.id === req.params.id);
  if (!proj) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  proj.envVars = req.body.envVars || [];
  saveDatabase(db);
  res.json(proj);
});

// Add mock JAR library
app.post("/api/projects/:id/jars", (req, res) => {
  const db = loadDatabase();
  const proj = db.projects.find((p: any) => p.id === req.params.id);
  if (!proj) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const { name, size, mavenCoordinate } = req.body;
  const jarId = "jar-" + Date.now();
  const newJar = {
    id: jarId,
    name: name || "custom-package.jar",
    size: size || 102400,
    uploadedAt: new Date().toISOString(),
    scannedClassesCount: 1,
    mavenCoordinate: mavenCoordinate || "",
    status: "SCANNED" as const
  };

  // Autogenerate a corresponding mock class inside the jar for instant testing!
  const mockClassName = name 
    ? name.replace(".jar", "").split("-").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join("")
    : "GenericService";

  const newClass = {
    packageName: "com.company.generated",
    className: mockClassName,
    fullyQualifiedName: `com.company.generated.${mockClassName}`,
    type: "CLASS" as const,
    annotations: ["@Service", "@DubboService"],
    isCustom: false,
    methods: [
      {
        name: "executeAction",
        modifiers: ["public"],
        returnType: "com.company.generated.ActionResponse",
        parameters: [
          {
            name: "payload",
            type: "com.company.generated.ActionPayload",
            isPrimitiveOrSimple: false,
            fields: [
              { name: "actionId", type: "java.lang.String", isPrimitiveOrSimple: true, isRequired: true },
              { name: "score", type: "java.lang.Double", isPrimitiveOrSimple: true, isRequired: false },
              { name: "enabled", type: "java.lang.Boolean", isPrimitiveOrSimple: true, isRequired: false }
            ]
          }
        ],
        description: `Custom action scan handler derived from imported JAR metadata of ${mockClassName}.`,
        sampleJson: JSON.stringify({
          payload: {
            actionId: "ACT-01",
            score: 0.95,
            enabled: true
          }
        }, null, 2)
      },
      {
        name: "getStatus",
        modifiers: ["public", "static"],
        returnType: "java.lang.String",
        parameters: [],
        description: "Fetch health readiness status for local executor thread context.",
        sampleJson: "{}"
      }
    ]
  };

  proj.jarFiles.push(newJar);
  proj.classes.push(newClass);
  saveDatabase(db);
  res.json({ jar: newJar, scannedClass: newClass });
});

// Compile and Scan custom Java class via AI
app.post("/api/projects/:id/custom-class", async (req, res) => {
  const db = loadDatabase();
  const proj = db.projects.find((p: any) => p.id === req.params.id);
  if (!proj) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const { sourceCode } = req.body;
  if (!sourceCode || sourceCode.trim() === "") {
    res.status(400).json({ error: "Java source code is required for scanning compilation" });
    return;
  }

  // Attempt using Gemini to perfectly compile Class metadata structure
  const ai = getAiClient();
  if (ai) {
    try {
      const prompt = `
      Read this Java Class source code and compile its structure into our JSON metadata schema for our API scanner.
      
      Java Source:
      ${sourceCode}
      
      Extract:
      1. Package name.
      2. Class name (e.g., "UserService").
      3. Fully qualified class name.
      4. Type: "INTERFACE", "CLASS", or "ENUM".
      5. List of annotations (e.g. ["@RestController", "@Service"]).
      6. List of public methods containing:
         - Method Name.
         - Modifiers (e.g. ["public", "static", "synchronized"]).
         - Return Type (e.g., "Result<UserVO>").
         - Generic return type inside the primary template brackets if present (e.g. "UserVO" for Result<UserVO>).
         - List of parameters. Define each parameter with its name, type, "isPrimitiveOrSimple" boolean (true if primitive, String, Long, Integer, Double, Boolean, BigDecimal, Date). If it's a complex Object, resolve "fields" arrays where each field has a name, type, and "isPrimitiveOrSimple" flag.
         - Short, human-designed description.
         - A valid sampleJson representing correct calling arguments as a key-value map mapping each parameter name to its mock json structure.
         
      Respond STRICTLY with a valid JSON in the structure:
      {
        "packageName": "...",
        "className": "...",
        "fullyQualifiedName": "...",
        "type": "INTERFACE" | "CLASS" | "ENUM",
        "annotations": ["..."],
        "methods": [
          {
            "name": "...",
            "modifiers": ["..."],
            "returnType": "...",
            "genericReturnType": "...",
            "parameters": [
              {
                "name": "...",
                "type": "...",
                "isPrimitiveOrSimple": true | false,
                "fields": [ // only if not simple
                  {"name": "...", "type": "...", "isPrimitiveOrSimple": true}
                ]
              }
            ],
            "description": "...",
            "sampleJson": "..."
          }
        ]
      }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const parsedMeta = JSON.parse(response.text || "{}");
      parsedMeta.sourceCode = sourceCode;
      parsedMeta.isCustom = true;

      // Update existing or add new
      const index = proj.classes.findIndex((c: any) => c.fullyQualifiedName === parsedMeta.fullyQualifiedName);
      if (index !== -1) {
        proj.classes[index] = parsedMeta;
      } else {
        proj.classes.push(parsedMeta);
      }

      saveDatabase(db);
      res.json(parsedMeta);
      return;
    } catch (err: any) {
      console.error("Gemini Scan AST parsing error, running high-fidelity regex compiler bypass:", err);
    }
  }

  // Backup regex compiler scan (High fidelity heuristic builder)
  try {
    const classMatch = sourceCode.match(/(?:public\s+)?(class|interface|enum)\s+(\w+)/);
    const pkgMatch = sourceCode.match(/package\s+([\w\.]+);/);

    if (!classMatch) {
      res.status(400).json({ error: "Source code scanning failed: No public class or interface structure identified." });
      return;
    }

    const type = classMatch[1].toUpperCase() as "CLASS" | "INTERFACE" | "ENUM";
    const className = classMatch[2];
    const pkg = pkgMatch ? pkgMatch[1] : "com.company.sandbox";
    const fullyQualifiedName = `${pkg}.${className}`;

    // Extract basic public methods using smart heuristics
    const methods: any[] = [];
    const regexMethod = /public\s+([\w\<\>]+)\s+(\w+)\s*\(([^)]*)\)/g;
    let match;
    while ((match = regexMethod.exec(sourceCode)) !== null) {
      const returnType = match[1];
      const name = match[2];
      const paramsText = match[3];

      const parameters: any[] = [];
      const sampleArgs: any = {};

      if (paramsText.trim()) {
        const parts = paramsText.split(",");
        parts.forEach((p, idx) => {
          const trimP = p.trim();
          const cleanP = trimP.split(/\s+/);
          if (cleanP.length >= 2) {
            const pType = cleanP[cleanP.length - 2];
            const pName = cleanP[cleanP.length - 1];
            const isSimple = ["String", "int", "long", "double", "boolean", "Integer", "Long", "Double", "Boolean", "BigDecimal"].some(s => pType.includes(s));
            
            parameters.push({
              name: pName,
              type: pType,
              isPrimitiveOrSimple: isSimple,
              fields: isSimple ? undefined : [
                { name: "id", type: "java.lang.Long", isPrimitiveOrSimple: true },
                { name: "name", type: "java.lang.String", isPrimitiveOrSimple: true }
              ]
            });

            sampleArgs[pName] = isSimple 
              ? (pType.toLowerCase().includes("string") ? "mock_value" : 123)
              : { id: 1, name: "mock_nested" };
          }
        });
      }

      methods.push({
        name,
        modifiers: ["public"],
        returnType,
        parameters,
        description: `Imported JVM compilation method scanner hook for ${name}.`,
        sampleJson: JSON.stringify(sampleArgs, null, 2)
      });
    }

    const fallbackMeta = {
      packageName: pkg,
      className,
      fullyQualifiedName,
      type,
      annotations: ["@Service"],
      isCustom: true,
      sourceCode,
      methods: methods.length > 0 ? methods : [
        {
          name: "testRun",
          modifiers: ["public"],
          returnType: "java.lang.String",
          parameters: [],
          description: "Scan placeholder diagnostics test method context.",
          sampleJson: "{}"
        }
      ]
    };

    const idx = proj.classes.findIndex((c: any) => c.fullyQualifiedName === fallbackMeta.fullyQualifiedName);
    if (idx !== -1) {
      proj.classes[idx] = fallbackMeta;
    } else {
      proj.classes.push(fallbackMeta);
    }

    saveDatabase(db);
    res.json(fallbackMeta);
  } catch (err: any) {
    res.status(500).json({ error: "JVM AST parser compiler crash error: " + err.message });
  }
});

// Dynamic Invoke Method Runtime Engine
app.post("/api/projects/:id/invoke", async (req, res) => {
  const db = loadDatabase();
  const proj = db.projects.find((p: any) => p.id === req.params.id);
  if (!proj) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const { className, methodName, argumentsJson, executeViaAi } = req.body;
  const targetClass = proj.classes.find((c: any) => c.fullyQualifiedName === className);
  if (!targetClass) {
    res.status(404).json({ error: "Target scanned Java class not found in project runtime classpath." });
    return;
  }

  const targetMethod = targetClass.methods.find((m: any) => m.name === methodName);
  if (!targetMethod) {
    res.status(404).json({ error: `Method ${methodName} was not scanned or loaded in class context.` });
    return;
  }

  let parsedArgs: any;
  try {
    parsedArgs = JSON.parse(argumentsJson || "{}");
  } catch (err) {
    res.status(400).json({ error: "Invalid calling arguments JSON syntax." });
    return;
  }

  const ai = getAiClient();
  const latencyBase = Math.floor(Math.random() * 80) + 15;

  // Use Gemini to execute class if chosen, OR if it's a dynamic custom user class and AI model is active
  if (ai && (executeViaAi || targetClass.isCustom)) {
    try {
      const runPrompt = `
      You are our cloud sandboxed JVM Thread Executor. We need you to execute a method call of a Java Class via runtime reflection simulator, inspect parameters structure, and calculate a hyper-authentic logical output matching the return schema.
      
      Class Source/Metadata Definition:
      ${targetClass.sourceCode ? `Source Code:\n${targetClass.sourceCode}` : `Metadata: ${JSON.stringify(targetClass)}`}
      
      Target Method:
      ${targetMethod.name}
      Return Type: ${targetMethod.returnType}
      
      Call Input Arguments (as JSON array or map parameter elements):
      ${JSON.stringify(parsedArgs, null, 2)}
      
      Instructions:
      1. Review the input arguments.
      2. If arguments violate business rules outlined in the class file, or have empty values for required fields (e.g. empty passwords, invalid accounts), compile a hyper-realistic JVM Exception trace instead (e.g., throwing com.company.exception.BusinessException, or java.lang.IllegalArgumentException with standard package stacktrace elements).
      3. Otherwise, compile a successful return structure filled with elegant, contextual, synthetics response data fitting the return types exactly.
      4. Simulate execution metrics:
         - status: "SUCCESS" or "EXCEPTION"
         - executionTimeMs: actual execution calculation simulation (e.g., 20-300ms)
         - memoryUsedKb: simulated garbage-collector track (e.g., 512Kb - 8000Kb)
         - returnValue: the return object (only if SUCCESS)
         - exceptionMessage: message (only if EXCEPTION)
         - stackTrace: simulated stack trace (only if EXCEPTION)
         - cpuLoadPercentage: (e.g. 1.5% to 45.0%)
         
      Respond STRICTLY in this JSON matrix format:
      {
        "status": "SUCCESS" | "EXCEPTION",
        "executionTimeMs": number,
        "memoryUsedKb": number,
        "returnValue": <any json matches return schema>,
        "exceptionMessage": "...",
        "stackTrace": "...",
        "cpuLoadPercentage": number
      }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: runPrompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1 // lower temperature for more predictable logical mock calculation
        }
      });

      const invokeRes = JSON.parse(response.text || "{}");
      invokeRes.threadName = "AI-VirtualJVM-Executor-Thread-" + Math.floor(Math.random() * 100);

      // Save into project histories log
      const logRecord = {
        id: "hist-" + Date.now(),
        projectId: proj.id,
        className,
        methodName,
        invokedAt: new Date().toISOString(),
        paramJson: argumentsJson,
        result: invokeRes
      };
      db.history.unshift(logRecord);
      saveDatabase(db);

      res.json(invokeRes);
      return;
    } catch (err: any) {
      console.error("Gemini invoke failure, carrying over high fidelity custom procedurals response:", err);
    }
  }

  // Pure high-fidelity rule-based engine simulation (Backup / Free tier performance)
  let resultObj: any;
  let executionStatus: "SUCCESS" | "EXCEPTION" = "SUCCESS";
  let exceptionMsg = "";
  let stackTrace = "";

  // Perform validation heuristics for user login
  if (className === "com.company.service.UserService" && methodName === "login") {
    const creds = parsedArgs.credentials;
    if (!creds || !creds.username || !creds.password) {
      executionStatus = "EXCEPTION";
      exceptionMsg = "java.lang.IllegalArgumentException: Credentials username and password parameters are strictly mandatory.";
      stackTrace = `java.lang.IllegalArgumentException: Credentials username and password parameters are strictly mandatory.
        at com.company.service.UserServiceImpl.login(UserServiceImpl.java:54)
        at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103)
        at java.base/java.lang.reflect.Method.invoke(Method.java:580)
        at org.apache.dubbo.common.bytecode.Wrapper1.invokeMethod(Wrapper1.java:12)`;
    } else if (creds.password === "error") {
      executionStatus = "EXCEPTION";
      exceptionMsg = "com.company.exception.AccountLockedException: Maximum invalid credentials sign-in retries exceeded on profile: " + creds.username;
      stackTrace = `com.company.exception.AccountLockedException: Maximum invalid credentials sign-in retries exceeded on profile.
        at com.company.service.UserServiceImpl.login(UserServiceImpl.java:62)
        at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103)`;
    } else {
      resultObj = {
        code: 200,
        msg: "SUCCESS",
        data: {
          id: creds.username === "admin" ? 48201 : Math.floor(Math.random() * 5000) + 1000,
          username: creds.username,
          email: `${creds.username}@enterprise.io`,
          status: "ACTIVE",
          createdTime: new Date(Date.now() - 15 * 86400000).toISOString(),
          balance: 8900.50
        }
      };
    }
  } else if (className === "com.company.service.UserService" && methodName === "queryUserById") {
    const uId = parsedArgs.userId;
    if (uId === undefined || uId === null || isNaN(Number(uId))) {
      executionStatus = "EXCEPTION";
      exceptionMsg = "java.lang.NullPointerException: Cannot invoke 'java.lang.Long.longValue()' because 'userId' is null";
      stackTrace = `java.lang.NullPointerException: Cannot invoke 'java.lang.Long.longValue()' because 'userId' is null
        at com.company.service.UserServiceImpl.queryUserById(UserServiceImpl.java:85)
        at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103)`;
    } else {
      resultObj = {
        code: 200,
        msg: "SUCCESS",
        data: {
          id: Number(uId),
          username: "user_session_" + uId,
          email: `profile_${uId}@org.com`,
          status: "ACTIVE",
          createdTime: new Date().toISOString(),
          balance: 240.25
        }
      };
    }
  } else if (className === "com.company.payment.PaymentGateway" && methodName === "createPayment") {
    const pay = parsedArgs.request;
    if (!pay || !pay.userId || !pay.orderNo || !pay.amount) {
      executionStatus = "EXCEPTION";
      exceptionMsg = "com.company.payment.exception.InvalidPaymentPayloadException: Missing vital entity attributes: client references.";
      stackTrace = `com.company.payment.exception.InvalidPaymentPayloadException: Missing vital entity attributes: client references.
        at com.company.payment.PaymentGatewayImpl.createPayment(PaymentGatewayImpl.java:42)`;
    } else {
      resultObj = {
        transactionId: "TX-" + Math.floor(Math.random() * 9000000000 + 1000000000),
        orderNo: pay.orderNo,
        amount: Number(pay.amount),
        currency: "USD",
        status: "SUCCESS",
        payUrl: `https://checkout.stripe.com/pay/sandbox_${Math.random().toString(36).substr(2, 9)}`,
        expiresAt: new Date(Date.now() + 1800000).toISOString()
      };
    }
  } else {
    // Blanket dynamic generic mockup resolver
    resultObj = {
      timestamp: Date.now(),
      status: "SUCCESS",
      classInvoked: className,
      methodInvoked: methodName,
      executionId: "EXEC-" + Math.random().toString(36).substring(2, 7)
    };
  }

  const finishedInv: any = {
    status: executionStatus,
    executionTimeMs: latencyBase,
    memoryUsedKb: Math.floor(Math.random() * 3000) + 800,
    cpuLoadPercentage: Number((Math.random() * 12 + 0.5).toFixed(2)),
    threadName: "DubboServerHandler-3000-thread-" + Math.floor(Math.random() * 40)
  };

  if (executionStatus === "SUCCESS") {
    finishedInv.returnValue = resultObj;
  } else {
    finishedInv.exceptionMessage = exceptionMsg;
    finishedInv.stackTrace = stackTrace;
  }

  // Append history record
  const logRecord = {
    id: "hist-" + Date.now(),
    projectId: proj.id,
    className,
    methodName,
    invokedAt: new Date().toISOString(),
    paramJson: argumentsJson,
    result: finishedInv
  };
  db.history.unshift(logRecord);
  saveDatabase(db);

  res.json(finishedInv);
});

// REST Endpoints for Scenarios
app.get("/api/projects/:id/scenarios", (req, res) => {
  const db = loadDatabase();
  const list = db.scenarios.filter((s: any) => s.projectId === req.params.id);
  res.json(list);
});

app.post("/api/projects/:id/scenarios", (req, res) => {
  const db = loadDatabase();
  const { name, description, steps } = req.body;
  if (!name) {
    res.status(400).json({ error: "Scenario name is required" });
    return;
  }
  const newScen = {
    id: "scen-" + Date.now(),
    projectId: req.params.id,
    name,
    description: description || "",
    steps: steps || [],
    createdAt: new Date().toISOString()
  };
  db.scenarios.push(newScen);
  saveDatabase(db);
  res.status(201).json(newScen);
});

app.put("/api/scenarios/:scenarioId", (req, res) => {
  const db = loadDatabase();
  const scen = db.scenarios.find((s: any) => s.id === req.params.scenarioId);
  if (!scen) {
    res.status(404).json({ error: "Scenario not found" });
    return;
  }
  scen.name = req.body.name || scen.name;
  scen.description = req.body.description || scen.description;
  scen.steps = req.body.steps || scen.steps;
  saveDatabase(db);
  res.json(scen);
});

app.delete("/api/scenarios/:scenarioId", (req, res) => {
  const db = loadDatabase();
  const index = db.scenarios.findIndex((s: any) => s.id === req.params.scenarioId);
  if (index === -1) {
    res.status(404).json({ error: "Scenario not found" });
    return;
  }
  db.scenarios.splice(index, 1);
  saveDatabase(db);
  res.json({ message: "Scenario deleted" });
});

// Run a complete Scenario Orchestrator flow
app.post("/api/projects/:id/scenarios/:scenarioId/execute", async (req, res) => {
  const db = loadDatabase();
  const proj = db.projects.find((p: any) => p.id === req.params.id);
  if (!proj) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const scenario = db.scenarios.find((s: any) => s.id === req.params.scenarioId);
  if (!scenario) {
    res.status(404).json({ error: "Scenario not found" });
    return;
  }

  // Pre-seed context variables with project global environments
  const context: Record<string, string> = {};
  proj.envVars.forEach((v: any) => {
    context[v.key] = v.value;
  });

  const stepExecutionResults: any[] = [];
  let scenarioPassed = true;

  // Sequentially evaluate each step in isolation (Server authoritative state)
  for (const step of scenario.steps) {
    // 1. Interpolate context variables inside arguments JSON string
    let resolvedArgsJson = step.argumentsJson;
    Object.entries(context).forEach(([k, v]) => {
      // Replace ${variableName} or key values
      resolvedArgsJson = resolvedArgsJson.replaceAll(`\${${k}}`, String(v));
      resolvedArgsJson = resolvedArgsJson.replaceAll(`"${k}"`, `"${v}"`); // fallback literal
    });

    // Invoke step target methods using the standard reflection simulation engine
    const targetClass = proj.classes.find((c: any) => c.fullyQualifiedName === step.targetClass);
    let stepInvResult: any;

    if (!targetClass) {
      stepInvResult = {
        status: "EXCEPTION",
        executionTimeMs: 0,
        memoryUsedKb: 0,
        cpuLoadPercentage: 0,
        exceptionMessage: `Classpath error: target scanned class is missing: ${step.targetClass}`
      };
    } else {
      // Execute the target mock directly via standard procedural pipeline
      const targetMethod = targetClass.methods.find((m: any) => m.name === step.targetMethod);
      if (!targetMethod) {
        stepInvResult = {
          status: "EXCEPTION",
          executionTimeMs: 0,
          memoryUsedKb: 0,
          cpuLoadPercentage: 0,
          exceptionMessage: `No scanned signature bound for ${step.targetMethod}`
        };
      } else {
        // Prepare execution mock response values (using our high-fidelity procedurals)
        const parsedArgs = JSON.parse(resolvedArgsJson || "{}");
        let resultObj: any = {};
        
        if (step.targetClass === "com.company.service.UserService" && step.targetMethod === "login") {
          resultObj = {
            code: 200,
            msg: "SUCCESS",
            data: {
              id: 48201,
              username: parsedArgs.credentials?.username || "admin",
              email: "admin@enterprise.io",
              status: "ACTIVE"
            }
          };
        } else if (step.targetClass === "com.company.payment.PaymentGateway" && step.targetMethod === "createPayment") {
          resultObj = {
            transactionId: "TX-" + Math.floor(Math.random() * 90000000 + 10000000),
            orderNo: parsedArgs.request?.orderNo || "ORD-SCENARIO-99",
            amount: parsedArgs.request?.amount || 250,
            currency: "USD",
            status: "SUCCESS"
          };
        } else {
          resultObj = {
            success: true,
            message: `Evaluated ${step.targetMethod} successfully.`,
            meta: { stepId: step.id }
          };
        }

        stepInvResult = {
          status: "SUCCESS",
          executionTimeMs: Math.floor(Math.random() * 45) + 12,
          memoryUsedKb: 1300,
          cpuLoadPercentage: 5.2,
          returnValue: resultObj
        };
      }
    }

    // 2. Perform Extracted Variables scanning (resolving JSON properties like metadata.data.id)
    const stepExtractedVars: Record<string, string> = {};
    if (stepInvResult.status === "SUCCESS" && stepInvResult.returnValue) {
      const resp = stepInvResult.returnValue;
      
      step.extractedVariables?.forEach((ev: any) => {
        // Extremely simple JSON path parser mapping for nested objects (e.g. $.data.id or data.id)
        let resolvedVal: any = undefined;
        let p = ev.jsonPath.replace(/^\$\.?/, ""); // clean $. or $
        const keys = p.split(".");
        
        let pointer = resp;
        for (const k of keys) {
          if (pointer && typeof pointer === "object" && k in pointer) {
            pointer = pointer[k];
          } else {
            pointer = undefined;
            break;
          }
        }
        
        if (pointer !== undefined) {
          resolvedVal = pointer;
          context[ev.contextKey] = String(resolvedVal);
          stepExtractedVars[ev.contextKey] = String(resolvedVal);
        }
      });
    }

    // 3. Evaluate Assertions
    const assertionResults: any[] = [];
    let stepPassed = stepInvResult.status === "SUCCESS";

    if (stepInvResult.status === "SUCCESS" && stepInvResult.returnValue) {
      const resp = stepInvResult.returnValue;
      
      step.assertions?.forEach((ass: any) => {
        let p = ass.jsonPath.replace(/^\$\.?/, "");
        const keys = p.split(".");
        
        let pointer = resp;
        for (const k of keys) {
          if (pointer && typeof pointer === "object" && k in pointer) {
            pointer = pointer[k];
          } else {
            pointer = undefined;
            break;
          }
        }

        const actualVal = pointer !== undefined ? String(pointer) : "undefined";
        let isMatch = false;

        switch (ass.operator) {
          case "EQUALS":
            isMatch = actualVal === String(ass.expectedValue);
            break;
          case "NOT_EQUALS":
            isMatch = actualVal !== String(ass.expectedValue);
            break;
          case "CONTAINS":
            isMatch = actualVal.toLowerCase().includes(String(ass.expectedValue).toLowerCase());
            break;
          case "GREATER_THAN":
            isMatch = Number(actualVal) > Number(ass.expectedValue);
            break;
          case "LESS_THAN":
            isMatch = Number(actualVal) < Number(ass.expectedValue);
            break;
          default:
            isMatch = false;
        }

        if (!isMatch) {
          stepPassed = false;
        }

        assertionResults.push({
          jsonPath: ass.jsonPath,
          operator: ass.operator,
          expectedValue: ass.expectedValue,
          actualValue: actualVal,
          passed: isMatch
        });
      });
    } else {
      stepPassed = false;
    }

    if (!stepPassed) {
      scenarioPassed = false;
    }

    stepExecutionResults.push({
      stepId: step.id,
      name: step.name,
      argumentsUsed: resolvedArgsJson,
      status: stepInvResult.status,
      executionTimeMs: stepInvResult.executionTimeMs,
      returnValue: stepInvResult.returnValue,
      exceptionMessage: stepInvResult.exceptionMessage,
      extractedVariables: stepExtractedVars,
      assertionResults,
      passed: stepPassed
    });
  }

  // Capture execution log in Database
  const summaryLog = {
    scenarioId: scenario.id,
    projectId: proj.id,
    executedAt: new Date().toISOString(),
    passed: scenarioPassed,
    stepCount: scenario.steps.length,
    results: stepExecutionResults,
    finalContext: context
  };

  res.json(summaryLog);
});

// REST Endpoints for History
app.get("/api/projects/:id/history", (req, res) => {
  const db = loadDatabase();
  const list = db.history.filter((h: any) => h.projectId === req.params.id);
  res.json(list);
});

// ============================================
// SERVER ENDPOINTS FOR GOOGLE GENAI CO-PILOT
// ============================================

// 1. AI Mock parameter value generation
app.post("/api/ai/generate-mock", async (req, res) => {
  const ai = getAiClient();
  const { className, methodName, parameters } = req.body;

  if (!ai) {
    // Generate simple placeholder parameters if key is absent
    const placeholder: Record<string, any> = {};
    parameters?.forEach((p: any) => {
      if (p.isPrimitiveOrSimple) {
        if (p.type.includes("String")) placeholder[p.name] = "synthetic_" + p.name;
        else if (p.type.includes("Boolean") || p.type === "boolean") placeholder[p.name] = true;
        else placeholder[p.name] = 42;
      } else {
        const nested: any = {};
        p.fields?.forEach((f: any) => {
          nested[f.name] = f.type.includes("String") ? "mock_string" : 100;
        });
        placeholder[p.name] = nested;
      }
    });
    res.json({ mockArgs: placeholder });
    return;
  }

  try {
    const prompt = `
    Generate complete synthetic mock data values for configuring a test call in our sandbox compiler.
    Class Name: ${className}
    Method Name: ${methodName}
    Parameters definition: ${JSON.stringify(parameters)}
    
    Format the mock data response as a single valid JSON key-value object where each root key represents the argument parameter name defined in the list, and maps it to a hyper-realistic value. For custom complex objects, nest the internal fields inside them.
    
    Let the mock values look authentic and professional (e.g. realistic phone numbers, business emails, UUIDs, ISO dates).
    Respond ONLY with the JSON:
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const mockArgs = JSON.parse(response.text || "{}");
    res.json({ mockArgs });
  } catch (err: any) {
    res.status(500).json({ error: "Gemini mock generator failed: " + err.message });
  }
});

// 2. AI Auto assertions suggester
app.post("/api/ai/suggest-assertions", async (req, res) => {
  const ai = getAiClient();
  const { className, methodName, returnType, sampleResponse } = req.body;

  if (!ai) {
    // Fallback static suggestions
    res.json({
      assertions: [
        { jsonPath: "$.code", operator: "EQUALS", expectedValue: "200" },
        { jsonPath: "$.msg", operator: "CONTAINS", expectedValue: "SUCCESS" }
      ]
    });
    return;
  }

  try {
    const prompt = `
    Based on the following Java Method returns signature and actual runtime response sample, suggest 2 to 4 key functional test assertions.
    Class: ${className}
    Method: ${methodName}
    Return Type: ${returnType}
    Sample Response Content: ${JSON.stringify(sampleResponse)}
    
    Choose meaningful properties to make assertions (e.g., checking status codes equals 200, checking non-empty transaction UUID arrays, positive balances, etc.).
    
    Respond strictly with a JSON payload with schema:
    {
      "assertions": [
        { "jsonPath": "$.data.username", "operator": "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN", "expectedValue": "..." }
      ]
    }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const suggestions = JSON.parse(response.text || "{}");
    res.json(suggestions);
  } catch (err: any) {
    res.status(500).json({ error: "Gemini auto-assertions failed: " + err.message });
  }
});

// 3. AI Call-Chain security and performance auditor code analysis
app.post("/api/ai/audit-call-chain", async (req, res) => {
  const ai = getAiClient();
  const { className, methodName, sourceCode } = req.body;

  if (!ai) {
    res.json({
      calledServices: ["RedisCacheService", "DatabaseTxManager"],
      touchedTables: ["t_user_profile", "t_security_token"],
      complexity: "MEDIUM",
      performanceBottlenecks: [
        "Unindexed lookup on username field in DB",
        "Direct nested blocking HTTP call during thread lock"
      ],
      optimizations: [
        "Apply standard Spring Boot @Cacheable on queryUserById interface method",
        "Enable non-blocking asynchronous WebClient for payment-gateway calls"
      ]
    });
    return;
  }

  try {
    const prompt = `
    Analyze the following method execution pathway for potential database queries, caching layers, complexity metrics, bottlenecks, and core architectural optimizations.
    Class: ${className}
    Method: ${methodName}
    Source Code context: ${sourceCode || "Default binary scans compile"}
    
    Generate an architectural audit report. Tell us:
    1. Hypothesized downstream services called (e.g. Redis, Kafka, Payment API, third-party authentication).
    2. Estimated database tables queried.
    3. Operation complexity ranking ("LOW", "MEDIUM", "HIGH").
    4. Two core performance bottlenecks (such as database query latency, blocking networks, memory allocations).
    5. Two key optimizations for enterprise deployment.
    
    Respond in JSON format:
    {
      "calledServices": ["..."],
      "touchedTables": ["..."],
      "complexity": "LOW" | "MEDIUM" | "HIGH",
      "performanceBottlenecks": ["..."],
      "optimizations": ["..."]
    }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const report = JSON.parse(response.text || "{}");
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: "Gemini Auditor analyzer failed: " + err.message });
  }
});

// Configure Vite and boot server
async function startServer() {
  // Vite dev middleware for bundling asset serving and HMR bypass routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully initialized and running on http://localhost:${PORT}`);
  });
}

startServer();
