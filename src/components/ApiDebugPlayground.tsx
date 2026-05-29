/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Play, 
  Terminal, 
  Cpu, 
  Database, 
  Sparkles, 
  Code2, 
  CheckCircle, 
  AlertOctagon, 
  FileCode2, 
  Copy, 
  RefreshCw, 
  Activity, 
  Check, 
  FileSpreadsheet,
  Layers,
  HelpCircle
} from "lucide-react";
import { Project, ScannedClass, JavaMethod, InvokeResult } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ApiDebugPlaygroundProps {
  project: Project;
  initialClassPath?: string;
  initialMethodName?: string;
  onSaveScenarioStep?: (stepData: any) => void;
}

export default function ApiDebugPlayground({ 
  project, 
  initialClassPath, 
  initialMethodName,
  onSaveScenarioStep 
}: ApiDebugPlaygroundProps) {
  
  // Class selection state
  const [selectedClassName, setSelectedClassName] = useState<string>(
    initialClassPath || (project.classes[0]?.fullyQualifiedName || "")
  );

  const selectedClass = project.classes.find(c => c.fullyQualifiedName === selectedClassName);

  const [selectedMethodName, setSelectedMethodName] = useState<string>(
    initialMethodName || (selectedClass?.methods[0]?.name || "")
  );

  const selectedMethod = selectedClass?.methods.find(m => m.name === selectedMethodName);

  // Sync state if selection cascades from scanner selection trigger
  useEffect(() => {
    if (initialClassPath) {
      setSelectedClassName(initialClassPath);
      const c = project.classes.find(cl => cl.fullyQualifiedName === initialClassPath);
      if (c) {
        if (initialMethodName && c.methods.some(m => m.name === initialMethodName)) {
          setSelectedMethodName(initialMethodName);
        } else {
          setSelectedMethodName(c.methods[0]?.name || "");
        }
      }
    }
  }, [initialClassPath, initialMethodName, project.classes]);

  // Request Parameter state (Monaco-like payload JSON)
  const [requestArgsJson, setRequestArgsJson] = useState<string>("{}");

  // Telemetry invocation states
  const [isExecuting, setIsExecuting] = useState(false);
  const [execViaAi, setExecViaAi] = useState(false);
  const [invokeResult, setInvokeResult] = useState<InvokeResult | null>(null);

  // Copilot and Auditor panel states
  const [isGeneratingMock, setIsGeneratingMock] = useState(false);
  const [isSuggestingAssertions, setIsSuggestingAssertions] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [auditReport, setAuditReport] = useState<any | null>(null);
  const [suggestedAssertions, setSuggestedAssertions] = useState<any[]>([]);
  const [generatedJUnit, setGeneratedJUnit] = useState<string>("");

  // Sync request JSON placeholder whenever method target shifts
  useEffect(() => {
    if (selectedMethod) {
      setRequestArgsJson(selectedMethod.sampleJson || "{}");
      setInvokeResult(null);
      setAuditReport(null);
      setSuggestedAssertions([]);
      setGeneratedJUnit("");
    }
  }, [selectedClassName, selectedMethodName]);

  // Execute Dynamic Reflection Invoke request
  const handleInvoke = async () => {
    if (!selectedClass || !selectedMethod) return;
    setIsExecuting(true);
    setInvokeResult(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className: selectedClass.fullyQualifiedName,
          methodName: selectedMethod.name,
          argumentsJson: requestArgsJson,
          executeViaAi: execViaAi
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Invocation error thrown on JVM thread.");
      }

      const val = await response.json();
      setInvokeResult(val);
      // Automatically compile test suite JUnit code
      compileJUnitBoilerplate(val);
    } catch (err: any) {
      setInvokeResult({
        status: "EXCEPTION",
        executionTimeMs: 0,
        memoryUsedKb: 0,
        cpuLoadPercentage: 0,
        exceptionMessage: err.message,
        stackTrace: `com.company.exception.PlatformBridgeException: Sandbox connection failed.
          at com.company.runtime.SandboxInvoker.execute(SandboxInvoker.java:94)
          at com.company.gate.InvokeService.invoke(InvokeService.java:31)`
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Co-Pilot 1: Generate AI mock parameters
  const generateAiMockData = async () => {
    if (!selectedClass || !selectedMethod) return;
    setIsGeneratingMock(true);
    try {
      const response = await fetch("/api/ai/generate-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className: selectedClass.fullyQualifiedName,
          methodName: selectedMethod.name,
          parameters: selectedMethod.parameters
        })
      });
      const data = await response.json();
      if (data.mockArgs) {
        setRequestArgsJson(JSON.stringify(data.mockArgs, null, 2));
      }
    } catch (err) {
      console.error("AI mock retrieval failed:", err);
    } finally {
      setIsGeneratingMock(false);
    }
  };

  // Co-Pilot 2: Suggest Assertions based on active result
  const suggestAiAssertions = async () => {
    if (!selectedClass || !selectedMethod || !invokeResult || invokeResult.status !== "SUCCESS") return;
    setIsSuggestingAssertions(true);
    try {
      const response = await fetch("/api/ai/suggest-assertions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className: selectedClass.fullyQualifiedName,
          methodName: selectedMethod.name,
          returnType: selectedMethod.returnType,
          sampleResponse: invokeResult.returnValue
        })
      });
      const data = await response.json();
      if (data.assertions) {
        setSuggestedAssertions(data.assertions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSuggestingAssertions(false);
    }
  };

  // Co-Pilot 3: Audit JVM class code pathways
  const auditCallChainCode = async () => {
    if (!selectedClass || !selectedMethod) return;
    setIsAuditing(true);
    setAuditReport(null);
    try {
      const response = await fetch("/api/ai/audit-call-chain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className: selectedClass.fullyQualifiedName,
          methodName: selectedMethod.name,
          sourceCode: selectedClass.sourceCode || ""
        })
      });
      const data = await response.json();
      setAuditReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuditing(false);
    }
  };

  // Export 1: Compile JUnit test mock boilerplate code based on JavaPoet concept
  const compileJUnitBoilerplate = (invRes: InvokeResult) => {
    if (!selectedClass || !selectedMethod) return;
    
    const simpleClassName = selectedClass.className;
    const methodName = selectedMethod.name;
    const formattedParams = requestArgsJson.replace(/\n/g, "\n        ");

    const code = `package ${selectedClass.packageName};

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("${simpleClassName} Test Suite")
public class ${simpleClassName}Test {

    private final ${simpleClassName} target = new ${simpleClassName}Impl();

    @Test
    @DisplayName("Invoke ${methodName} with configured environment parameters")
    public void test_${methodName}_executionFlow() {
        // Given parameter configurations parsed in sandbox:
        // ${formattedParams}
        
        ${invRes.status === "SUCCESS" ? `
        // When dynamic execution is completed:
        var result = target.${methodName}(/* mapped arguments */);

        // Then verify resulting properties conform to specification:
        assertThat(result).isNotNull();
        // TODO: add assertions suggested by AI co-pilot tracker
        ` : `
        // When verification fails, expect JVM standard exception throw:
        assertThatThrownBy(() -> {
            target.${methodName}(/* invalid args representation */);
        }).isInstanceOf(RuntimeException.class);
        `}
    }
}`;
    setGeneratedJUnit(code);
  };

  // Export 2: Save active playground setup as a modular step inside a custom scenario
  const handleSaveStepToScenario = () => {
    if (!onSaveScenarioStep || !selectedClass || !selectedMethod) return;
    onSaveScenarioStep({
      name: `Step: ${selectedClass.className}.${selectedMethod.name}`,
      targetClass: selectedClass.fullyQualifiedName,
      targetMethod: selectedMethod.name,
      argumentsJson: requestArgsJson
    });
  };

  // Copy helper
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto h-full items-stretch">
      
      {/* LEFT AREA: Config Parameters (7 columns) */}
      <div className="xl:col-span-7 flex flex-col gap-6">
        
        {/* Module 1: Method targeting box */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex-1">
            <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1.5 font-bold">Target Scanned Class</label>
            <select
              value={selectedClassName}
              onChange={e => {
                setSelectedClassName(e.target.value);
                const firstMeth = project.classes.find(c => c.fullyQualifiedName === e.target.value)?.methods[0]?.name || "";
                setSelectedMethodName(firstMeth);
              }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 cursor-pointer focus:outline-hidden focus:border-amber-500"
            >
              {project.classes.map(c => (
                <option key={c.fullyQualifiedName} value={c.fullyQualifiedName}>
                  {c.packageName}.{c.className}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1.5 font-bold">Target Reflection Method</label>
            <select
              value={selectedMethodName}
              onChange={e => setSelectedMethodName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 cursor-pointer focus:outline-hidden focus:border-amber-500"
            >
              {selectedClass?.methods.map(m => (
                <option key={m.name} value={m.name}>
                  {m.modifiers.join(" ")} {m.returnType.split(".").pop()} {m.name}()
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Module 2: Argument JSON parameters Editor with Monaco aesthetics */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex-1 flex flex-col justify-between min-h-[420px] gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-200 uppercase flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-amber-500" />
                Reflection Argument Payload (JSON Map)
              </span>

              <div className="flex items-center gap-2">
                <button 
                  onClick={generateAiMockData}
                  disabled={isGeneratingMock}
                  className="px-2 py-1 text-[10px] font-mono font-semibold rounded-lg text-amber-400 bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/10 cursor-pointer disabled:opacity-40 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isGeneratingMock ? "Synthesizing Mock..." : "AI Mock Value"}
                </button>
              </div>
            </div>

            {selectedMethod && (
              <span className="text-[11px] text-zinc-500 font-mono italic leading-relaxed block bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900">
                {selectedMethod.description || "Class reflection descriptor empty."}
              </span>
            )}

            {/* Styled Editor TextArea */}
            <div className="relative">
              <textarea
                value={requestArgsJson}
                onChange={e => setRequestArgsJson(e.target.value)}
                className="w-full h-64 bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-200 font-mono tracking-wide leading-relaxed focus:outline-hidden focus:border-amber-500/50"
              />
              <span className="absolute bottom-3 right-3 text-[10px] text-zinc-600 font-mono">
                UTF-8 Schema Mapped
              </span>
            </div>
          </div>

          {/* Trigger invoke actions footer */}
          <div className="border-t border-zinc-800 pb-1 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            
            {/* Play Mode: Switch procedural mock vs Server API Sandbox Engine */}
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={execViaAi}
                  onChange={e => setExecViaAi(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:width-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-zinc-950 peer-checked:after:border-amber-600"></div>
                <span className="ml-2 text-xs font-mono font-medium text-zinc-400 flex items-center gap-1">
                  Server AI Sandbox Thread
                  <Sparkles className="w-3 h-3 text-amber-500" />
                </span>
              </label>
              <span className="text-[10px] bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900 text-zinc-500 font-mono hidden sm:inline">
                {execViaAi ? "@google/genai active" : "procedural bypass"}
              </span>
            </div>

            {/* Run invokes & Scenario bindings */}
            <div className="flex items-center gap-2">
              {onSaveScenarioStep && (
                <button
                  type="button"
                  onClick={handleSaveStepToScenario}
                  className="px-3.5 py-2 font-mono font-bold text-xs rounded-xl border border-zinc-700/80 hover:bg-zinc-900 cursor-pointer text-zinc-300 hover:text-zinc-100 flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Add to Scenario
                </button>
              )}

              <button
                type="button"
                disabled={isExecuting}
                onClick={handleInvoke}
                className="px-5 py-2.5 font-mono font-bold text-xs text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Executing JVM...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Invoke Dynamic Method
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT AREA: Response & Telemetry diagnostics (5 columns) */}
      <div className="xl:col-span-5 flex flex-col gap-6">
        
        {/* Telemetry Dashboard Stats */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-850 pb-2.5">
            <Activity className="w-4 h-4 text-amber-500" />
            Active Invocation Dispatch Telemetry
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/80 flex flex-col gap-1 text-center font-mono">
              <span className="text-[9px] text-zinc-500 uppercase block">Execution Latency</span>
              <span className={`text-sm font-bold block ${
                invokeResult ? (invokeResult.executionTimeMs > 100 ? "text-amber-400" : "text-emerald-400") : "text-zinc-600"
              }`}>
                {invokeResult ? `${invokeResult.executionTimeMs} ms` : "-- ms"}
              </span>
            </div>
            <div className="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/80 flex flex-col gap-1 text-center font-mono">
              <span className="text-[9px] text-zinc-500 uppercase block">GC Memory Used</span>
              <span className="text-sm font-bold block text-zinc-300">
                {invokeResult ? `${invokeResult.memoryUsedKb} KB` : "-- KB"}
              </span>
            </div>
            <div className="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/80 flex flex-col gap-1 text-center font-mono">
              <span className="text-[9px] text-zinc-500 uppercase block">Virtual VM Status</span>
              <span className={`text-sm font-bold block ${
                invokeResult ? (invokeResult.status === "SUCCESS" ? "text-emerald-400" : "text-red-400") : "text-zinc-600"
              }`}>
                {invokeResult ? invokeResult.status : "STANDBY"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 font-mono text-[10px] text-zinc-500">
            <div className="flex items-center justify-between">
              <span>Dynamic Thread Dispatcher:</span>
              <span className="text-zinc-400">{invokeResult?.threadName || "Unassigned"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>CPU Core Registration:</span>
              <span className="text-zinc-400">
                {invokeResult?.cpuLoadPercentage !== undefined ? `${invokeResult.cpuLoadPercentage}%` : "0.00%"}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Execution Result Output Panel */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex-1 flex flex-col gap-3 min-h-[350px]">
          <h3 className="text-xs font-mono font-bold text-zinc-200 uppercase flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-amber-500" />
            JVM System.out / Return Output Stream
          </h3>

          <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-3 flex-1 overflow-y-auto leading-relaxed max-h-[380px]">
            {invokeResult ? (
              invokeResult.status === "SUCCESS" ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 border-b border-emerald-500/10 pb-1.5 mb-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Invocation returned SUCCESS context:
                  </div>
                  <pre className="text-xs font-mono text-emerald-400 font-medium">
                    {JSON.stringify(invokeResult.returnValue, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col gap-3 font-mono">
                  <div className="flex items-center gap-1.5 text-[11px] text-red-400 border-b border-red-500/10 pb-1.5">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    JVM JVM_ReflectionException thrown:
                  </div>
                  <span className="text-xs text-red-500 font-bold block bg-red-500/5 p-2 rounded border border-red-500/15">
                    {invokeResult.exceptionMessage}
                  </span>
                  <pre className="text-[10px] text-zinc-500 leading-relaxed overflow-x-auto whitespace-pre block bg-zinc-900 p-2.5 rounded mt-1 max-h-48">
                    {invokeResult.stackTrace}
                  </pre>
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 py-20 text-center">
                <Activity className="w-6 h-6 text-zinc-800 animate-pulse" />
                <span className="text-xs font-mono text-zinc-600 leading-normal">
                  Sandbox awaiting dynamic calling execution dispatch...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic AI Co-pilots suggestions section */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
            <span className="text-xs font-mono font-bold text-amber-500/90 uppercase flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-500 animate-bounce" />
              AI Code-Gen & Security Audit Playground
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={auditCallChainCode}
              disabled={isAuditing}
              className="px-3 py-2 text-[10.5px] font-mono rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-40"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Audit Call Chain
            </button>
            <button
              onClick={suggestAiAssertions}
              disabled={isSuggestingAssertions || !invokeResult || invokeResult.status !== "SUCCESS"}
              className="px-3 py-2 text-[10.5px] font-mono rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-40"
            >
              <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
              Suggest Assertions
            </button>
          </div>

          {/* Render Active Co-pilot reports/suggestions */}
          <AnimatePresence mode="wait">
            {isAuditing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-mono text-zinc-500 text-center py-4 flex items-center gap-2 justify-center">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" /> Calculating AST code-path security triggers...
              </motion.div>
            )}

            {auditReport && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                className="bg-zinc-950 p-4 border border-zinc-800/80 rounded-xl text-xs flex flex-col gap-3 font-mono"
              >
                <div className="flex items-center justify-between text-[11px] text-zinc-300 border-b border-zinc-900 pb-1.5">
                  <span className="text-amber-500 font-bold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> Static Code-path auditor report:
                  </span>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                    Complexity: {auditReport.complexity}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Downstream called services</span>
                  <div className="flex flex-wrap gap-1">
                    {auditReport.calledServices?.map((s: string) => (
                      <span key={s} className="bg-zinc-905 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 border border-zinc-900">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Estimated database tables touches</span>
                  <div className="flex flex-wrap gap-1">
                    {auditReport.touchedTables?.map((t: string) => (
                      <span key={t} className="bg-zinc-905 px-1.5 py-0.5 rounded text-[10px] text-teal-400/80 border border-zinc-900">{t}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-red-500/60 block mb-1">Identified Performance bottlenecks</span>
                  <ul className="list-disc pl-4 text-[10.5px] text-zinc-400 flex flex-col gap-1">
                    {auditReport.performanceBottlenecks?.map((b: string) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-500/60 block mb-1">Recommended optimizations</span>
                  <ul className="list-disc pl-4 text-[10.5px] text-emerald-400/80 flex flex-col gap-1">
                    {auditReport.optimizations?.map((o: string) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {suggestedAssertions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                className="bg-zinc-950 p-4 border border-zinc-800/80 rounded-xl text-xs flex flex-col gap-3 font-mono"
              >
                <div className="flex items-center justify-between text-[11px] text-zinc-300 border-b border-zinc-900 pb-1.5">
                  <span className="text-teal-400 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Suggested assertions rules for scenarios:
                  </span>
                  <span className="text-[9px] text-zinc-500">Auto-calculated</span>
                </div>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                  {suggestedAssertions.map((ass, idx) => (
                    <div key={idx} className="bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-lg flex items-center justify-between text-[10.5px]">
                      <div>
                        <span className="text-zinc-400 block font-semibold">{ass.jsonPath}</span>
                        <span className="text-zinc-650 inline bg-zinc-950 border border-zinc-900 p-0.5 rounded text-[9px] text-zinc-400 mr-2">{ass.operator}</span>
                        <span className="text-emerald-400 font-bold">{ass.expectedValue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Generated JUnit Exporter block */}
            {generatedJUnit && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                className="bg-zinc-950 p-4 border border-zinc-800/80 rounded-xl text-xs flex flex-col gap-3 font-mono"
              >
                <div className="flex items-center justify-between text-[11px] border-b border-zinc-900 pb-1.5">
                  <span className="text-amber-500 font-bold flex items-center gap-1">
                    <FileCode2 className="w-3.5 h-3.5" /> Formatted JUnit5 AssertJ test code:
                  </span>
                  <button 
                    onClick={() => handleCopyToClipboard(generatedJUnit)}
                    className="text-zinc-500 hover:text-zinc-300 p-1 flex items-center gap-1"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="text-[10px] text-zinc-400 leading-relaxed max-h-48 overflow-auto block whitespace-pre">
                  {generatedJUnit}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
