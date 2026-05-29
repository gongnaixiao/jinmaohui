/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Play, 
  Plus, 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  RefreshCw, 
  Layers, 
  FileSpreadsheet, 
  ChevronDown, 
  ChevronUp, 
  PlusCircle, 
  Braces, 
  Check, 
  Bookmark,
  TrendingUp,
  Settings,
  GitCommit
} from "lucide-react";
import { Project, Scenario, ScenarioStep } from "@jarlink/shared";
import { motion, AnimatePresence } from "motion/react";

interface ScenarioOrchestratorProps {
  project: Project;
  scenarios: Scenario[];
  onAddScenario: (name: string, description: string, steps: ScenarioStep[]) => Promise<void>;
  onDeleteScenario: (id: string) => Promise<void>;
  onExecuteScenario: (scenarioId: string) => Promise<any>;
}

export default function ScenarioOrchestrator({
  project,
  scenarios,
  onAddScenario,
  onDeleteScenario,
  onExecuteScenario
}: ScenarioOrchestratorProps) {
  
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    scenarios[0]?.id || ""
  );

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);

  // Creator state
  const [isAddingScenario, setIsAddingScenario] = useState(false);
  const [newScenName, setNewScenName] = useState("");
  const [newScenDesc, setNewScenDesc] = useState("");

  // Running controller state
  const [isRunning, setIsRunning] = useState(false);
  const [runLogs, setRunLogs] = useState<any | null>(null);
  const [activeStepRunningIdx, setActiveStepRunningIdx] = useState<number | null>(null);

  // Accordion state
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  // New step creation configurations
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [newStepClass, setNewStepClass] = useState<string>(project.classes[0]?.fullyQualifiedName || "");
  const [newStepMethod, setNewStepMethod] = useState<string>("");
  const [newStepArgs, setNewStepArgs] = useState<string>("{}");
  
  const [newStepVarKey, setNewStepVarKey] = useState("");
  const [newStepVarPath, setNewStepVarPath] = useState("");
  const [newStepAssPath, setNewStepAssPath] = useState("");
  const [newStepAssOp, setNewStepAssOp] = useState<"EQUALS" | "CONTAINS">("EQUALS");
  const [newStepAssVal, setNewStepAssVal] = useState("");

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenName) return;
    try {
      // Create with initial standard templates
      const firstClass = project.classes[0];
      const firstMethod = firstClass?.methods[0];
      
      const defaultSteps: ScenarioStep[] = [
        {
          id: "step-" + Date.now(),
          name: `Step 1: Check ${firstClass?.className || "Service"} configuration`,
          targetClass: firstClass?.fullyQualifiedName || "",
          targetMethod: firstMethod?.name || "",
          argumentsJson: firstMethod?.sampleJson || "{}",
          extractedVariables: [],
          assertions: [
            { jsonPath: "$.status", operator: "EQUALS", expectedValue: "SUCCESS" }
          ]
        }
      ];

      await onAddScenario(newScenName, newScenDesc, defaultSteps);
      setNewScenName("");
      setNewScenDesc("");
      setIsAddingScenario(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStepToScenario = async () => {
    if (!selectedScenario || !newStepClass || !newStepMethod) return;

    const methodObj = project.classes.find(c => c.fullyQualifiedName === newStepClass)?.methods.find(m => m.name === newStepMethod);

    const newStep: ScenarioStep = {
      id: "step-" + Date.now(),
      name: `Step: Invoke ${newStepMethod}`,
      targetClass: newStepClass,
      targetMethod: newStepMethod,
      argumentsJson: newStepArgs,
      extractedVariables: newStepVarKey && newStepVarPath ? [{ jsonPath: newStepVarPath, contextKey: newStepVarKey }] : [],
      assertions: newStepAssPath && newStepAssVal ? [{ jsonPath: newStepAssPath, operator: newStepAssOp, expectedValue: newStepAssVal }] : []
    };

    const updatedSteps = [...selectedScenario.steps, newStep];
    
    // Call API update
    try {
      const response = await fetch(`/api/scenarios/${selectedScenario.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: updatedSteps })
      });
      if (response.ok) {
        selectedScenario.steps = updatedSteps;
        setIsAddingStep(false);
        setNewStepVarKey("");
        setNewStepVarPath("");
        setNewStepAssPath("");
        setNewStepAssVal("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteScenarioAction = async () => {
    if (!selectedScenarioId) return;
    if (confirm("Are you sure you want to delete this Scenario flow?")) {
      await onDeleteScenario(selectedScenarioId);
      setSelectedScenarioId(scenarios[0]?.id || "");
    }
  };

  const handleRunScenarioSuite = async () => {
    if (!selectedScenarioId) return;
    setIsRunning(true);
    setRunLogs(null);
    setActiveStepRunningIdx(0);
    
    try {
      // Simulate rolling step evaluations visuals
      const stepsCount = selectedScenario?.steps.length || 1;
      for (let i = 0; i < stepsCount; i++) {
        await new Promise(r => setTimeout(r, 650));
        setActiveStepRunningIdx(i);
      }

      await new Promise(r => setTimeout(r, 200));
      const results = await onExecuteScenario(selectedScenarioId);
      setRunLogs(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
      setActiveStepRunningIdx(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto h-full items-stretch">
      {/* LEFT AREA: Scenarios lists & Details tree (5 columns) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Scenario Config module */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-855 pb-3">
            <h2 className="text-sm font-mono font-bold text-zinc-100 flex items-center gap-2 font-bold">
              <Layers className="w-4 h-4 text-amber-500" />
              Scenario Suites Registry
            </h2>
            <button 
              onClick={() => setIsAddingScenario(!isAddingScenario)}
              className="px-2.5 py-1 text-xs font-mono font-bold text-amber-500 border border-amber-500/20 hover:bg-amber-500/10 rounded-lg cursor-pointer flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              New Flow
            </button>
          </div>

          <AnimatePresence>
            {isAddingScenario && (
              <motion.form 
                onSubmit={handleCreateScenario}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-zinc-950/60 rounded-xl p-4 border border-zinc-850 flex flex-col gap-3.5 overflow-hidden"
              >
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Scenario Name</label>
                  <input 
                    type="text" 
                    placeholder="E.g. Authorized Order Sign-off"
                    required
                    value={newScenName}
                    onChange={e => setNewScenName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Description</label>
                  <textarea 
                    placeholder="Verify authentication token binds successfully downstream to gateway queries."
                    value={newScenDesc}
                    onChange={e => setNewScenDesc(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500 font-mono h-16 resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end mt-1">
                  <button 
                    type="button" 
                    onClick={() => setIsAddingScenario(false)}
                    className="px-3 py-1.5 text-xs font-mono rounded-lg hover:text-zinc-200 cursor-pointer text-zinc-400"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-3.5 py-1.5 text-xs font-mono font-bold rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 cursor-pointer"
                  >
                    Create
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Scenarios select cards */}
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {scenarios.length === 0 ? (
              <span className="text-xs text-zinc-500 font-mono italic">No integration scenarios configured.</span>
            ) : (
              scenarios.map(s => {
                const isActive = s.id === selectedScenarioId;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedScenarioId(s.id);
                      setRunLogs(null);
                    }}
                    className={`text-left w-full h-auto rounded-xl p-3 border transition-colors cursor-pointer ${
                      isActive 
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold" 
                        : "bg-zinc-955/40 border-zinc-900 hover:border-zinc-800 text-zinc-300"
                    }`}
                  >
                    <span className="text-xs font-mono block font-bold mb-1">{s.name}</span>
                    <span className="text-[10.5px] text-zinc-500 font-sans block leading-normal line-clamp-1">{s.description}</span>
                    <span className="text-[9px] text-zinc-400 font-mono font-medium mt-1 inline-block bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                      {s.steps.length} Steps Sequence
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Scenario Step Pipeline map visuals */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
              Pipeline Steps Graph Overview
            </h2>
            {selectedScenarioId && (
              <button 
                onClick={handleDeleteScenarioAction}
                className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer transition-colors"
                title="Delete active scenario"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[380px] pr-1">
            {selectedScenario ? (
              selectedScenario.steps.map((step, idx) => {
                const isStepRunning = activeStepRunningIdx === idx;
                const lastStepOutput = runLogs?.results.find((r: any) => r.stepId === step.id);
                const isStepPassed = lastStepOutput?.passed;

                return (
                  <div key={step.id} className="relative flex items-start gap-4">
                    {/* Pipeline vertical joining line */}
                    {idx < selectedScenario.steps.length - 1 && (
                      <span className="absolute left-[13px] top-[26px] bottom-[-20px] w-[2px] bg-zinc-800" />
                    )}

                    {/* Left node status indicator icon */}
                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 z-10 font-mono text-[11px] font-bold ${
                      isStepRunning ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse" :
                      runLogs ? (isStepPassed ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-red-500 bg-red-500/10 text-red-400") :
                      "border-zinc-800 bg-zinc-900 text-zinc-400"
                    }`}>
                      {runLogs ? (
                        isStepPassed ? <Check className="w-3.5 h-3.5" /> : "!"
                      ) : (
                        idx + 1
                      )}
                    </div>

                    {/* Step Card details */}
                    <div className="flex-1 bg-zinc-950/60 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-zinc-100">{step.name}</span>
                        <button 
                          onClick={() => setExpandedStepId(expandedStepId === step.id ? null : step.id)}
                          className="text-zinc-650 hover:text-zinc-400 p-0.5 cursor-pointer"
                        >
                          {expandedStepId === step.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <span className="text-[10px] text-zinc-500 block truncate font-mono bg-zinc-900 border border-zinc-900 p-1 rounded">
                        API: {step.targetClass.split(".").pop()}.{step.targetMethod}()
                      </span>

                      {/* Accordion values mapping details dropdown */}
                      {(expandedStepId === step.id || isStepRunning) && (
                        <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-zinc-900 font-mono text-[10px]">
                          <div>
                            <span className="text-zinc-500 uppercase block font-bold mb-0.5">Mock Arguments</span>
                            <pre className="bg-zinc-950 p-1.5 rounded text-zinc-305 text-[9.5px] truncate block max-h-16 overflow-y-auto">
                              {step.argumentsJson}
                            </pre>
                          </div>

                          {step.extractedVariables.length > 0 && (
                            <div>
                              <span className="text-zinc-500 uppercase block font-bold mb-0.5">Value extractions</span>
                              {step.extractedVariables.map((ev, i) => (
                                <div key={i} className="flex justify-between text-[9px] bg-zinc-900 px-1.5 py-0.5 rounded">
                                  <span className="text-zinc-400">{ev.jsonPath}</span>
                                  <span className="text-amber-500">&rarr; ${ev.contextKey}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {step.assertions.length > 0 && (
                            <div>
                              <span className="text-zinc-500 uppercase block font-bold mb-0.5">Test Assertions</span>
                              {step.assertions.map((ass, i) => (
                                <div key={i} className="flex justify-between text-[9px] bg-zinc-900 px-1.5 py-0.5 rounded">
                                  <span className="text-zinc-400">{ass.jsonPath} {ass.operator}</span>
                                  <span className="text-teal-400 font-bold">{ass.expectedValue}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <Bookmark className="w-10 h-10 text-zinc-700" />
                <span className="text-xs font-mono text-zinc-500">
                  Select or register an integration scenario to analyze.
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* RIGHT AREA: Live Executor and Variables dashboard (7 columns) */}
      <div className="lg:col-span-7 flex flex-col h-full gap-6">
        
        {/* Workspace core */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-5 flex-1 justify-between min-h-[500px]">
          
          <div className="flex flex-col gap-4">
            
            {/* Header controls controller */}
            <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center">
                  <Terminal className="text-amber-500/80 w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold text-zinc-200 block uppercase">
                    Execution JVM Sandbox Context
                  </h3>
                  <span className="text-[10.5px] font-mono text-zinc-500">
                    {selectedScenario ? `Orchestrating Flow Suite: ${selectedScenario.name}` : "Awaiting selection"}
                  </span>
                </div>
              </div>

              {selectedScenario && (
                <button
                  type="button"
                  disabled={isRunning || selectedScenario.steps.length === 0}
                  onClick={handleRunScenarioSuite}
                  className="px-4 py-1.5 font-mono font-bold text-xs rounded-xl bg-amber-500 text-zinc-955 hover:bg-amber-400 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Run Integration Suite
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Run logs stream output view */}
            <div className="min-h-[220px] bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-y-auto max-h-[300px]">
              {runLogs ? (
                <div className="flex flex-col gap-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-amber-500" /> Sandbox Execution Console output:
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                      runLogs.passed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {runLogs.passed ? "Suite Passed" : "Suite Failed"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {runLogs.results.map((res: any, idx: number) => (
                      <div key={res.stepId} className="flex flex-col gap-2 bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850">
                        <div className="flex items-center justify-between gap-4">
                          <span className={`font-bold flex items-center gap-1.5 text-xs ${res.passed ? "text-emerald-400" : "text-red-400"}`}>
                            {res.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            Step {idx + 1}: {res.name}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-normal">{res.executionTimeMs}ms latency</span>
                        </div>

                        {/* Extracted Variables trace logs */}
                        {Object.keys(res.extractedVariables).length > 0 && (
                          <div className="text-[10px] bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 px-2 py-1 rounded">
                            <span className="text-zinc-500 uppercase block font-bold mb-1">State extracted updates:</span>
                            {Object.entries(res.extractedVariables).map(([k, v]: any) => (
                              <div key={k} className="flex items-center justify-between font-mono">
                                <span className="text-zinc-400">${k}</span>
                                <span className="text-amber-500">{v}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Assert details */}
                        {res.assertionResults.length > 0 && (
                          <div className="text-[10px]">
                            <span className="text-zinc-500 uppercase block font-bold mb-1">Assertions results tracker:</span>
                            {res.assertionResults.map((ass: any, assIdx: number) => (
                              <div key={assIdx} className="flex justify-between font-mono">
                                <span className="text-zinc-500">{ass.jsonPath} {ass.operator} {ass.expectedValue}</span>
                                <span className={ass.passed ? "text-emerald-400" : "text-red-400"}>
                                  {ass.passed ? "Passed" : `Failed (actual: ${ass.actualVal})`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Context registry variables output dump */}
                  <div className="border-t border-zinc-900 pt-3 mt-1 flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">Context Registry Variables Snapshot:</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      {Object.entries(runLogs.finalContext).map(([k, v]: any) => (
                        <div key={k} className="flex justify-between bg-zinc-900 border border-zinc-855 p-1.5 rounded">
                          <span className="text-zinc-500">{k}</span>
                          <span className="text-zinc-200 truncate max-w-[140px]">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : isRunning ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center gap-1.5">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                  <span className="text-xs font-mono text-zinc-500 leading-normal animate-pulse">
                    Evaluating dynamic steps sequential assertions...
                  </span>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center gap-1.5">
                  <Terminal className="w-6 h-6 text-zinc-800" />
                  <span className="text-xs font-mono text-zinc-650 leading-normal">
                    Integration Suite Console output stream waiting...
                  </span>
                </div>
              )}
            </div>

            {/* Quick action: Add customized Steps details to Scenarios on classpath */}
            {selectedScenarioId && (
              <div className="border-t border-zinc-800/80 pt-5 mt-4">
                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-900 pb-2">
                    <span className="text-xs font-mono font-bold text-amber-500 flex items-center gap-1">
                      <PlusCircle className="w-4 h-4 text-amber-500" />
                      Add Sequential Invocation Step to Scenario
                    </span>
                    <span className="text-[10px] font-mono text-zinc-505">pipeline mapping suite</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[9.5px] font-mono text-zinc-500 block mb-1">Target Class</label>
                      <select 
                        value={newStepClass}
                        onChange={e => {
                          setNewStepClass(e.target.value);
                          setNewStepMethod("");
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 font-mono cursor-pointer"
                      >
                        {project.classes.map(c => (
                          <option key={c.fullyQualifiedName} value={c.fullyQualifiedName}>{c.className}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9.5px] font-mono text-zinc-505 block mb-1">Method Signature</label>
                      <select 
                        value={newStepMethod}
                        onChange={e => {
                          setNewStepMethod(e.target.value);
                          const meth = project.classes.find(c => c.fullyQualifiedName === newStepClass)?.methods.find(m => m.name === e.target.value);
                          setNewStepArgs(meth?.sampleJson || "{}");
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 font-mono cursor-pointer"
                      >
                        <option value="">-- Choose method --</option>
                        {project.classes.find(c => c.fullyQualifiedName === newStepClass)?.methods.map(m => (
                          <option key={m.name} value={m.name}>{m.name}()</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9.5px] font-mono text-zinc-500 block mb-1">Mock Arguments JSON {`(${newStepMethod ? 'supports token variables like ${sessionUserId}' : ''})`}</label>
                    <textarea 
                      className="w-full h-20 bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-100 font-mono"
                      value={newStepArgs}
                      onChange={e => setNewStepArgs(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-900 pt-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9.5px] font-mono text-zinc-400 block font-bold uppercase">1. State Extraction (Optional)</span>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="text" 
                          placeholder="JSONPath e.g. $.data.id" 
                          value={newStepVarPath}
                          onChange={e => setNewStepVarPath(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 font-mono text-[10.5px] text-zinc-400"
                        />
                        <span className="text-zinc-650">&rarr;</span>
                        <input 
                          type="text" 
                          placeholder="Variable Key" 
                          value={newStepVarKey}
                          onChange={e => setNewStepVarKey(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 font-mono text-[10.5px] text-zinc-405"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9.5px] font-mono text-zinc-400 block font-bold uppercase">2. Test Assertion (Optional)</span>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="text" 
                          placeholder="JSONPath e.g. $.code" 
                          value={newStepAssPath}
                          onChange={e => setNewStepAssPath(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-805 rounded px-1.5 py-1 font-mono text-[10.5px] text-zinc-400"
                        />
                        <select 
                          value={newStepAssOp} 
                          onChange={e => setNewStepAssOp(e.target.value as any)}
                          className="bg-zinc-900 border border-zinc-805 rounded px-1 py-1 font-mono text-[10px] text-zinc-450 cursor-pointer"
                        >
                          <option value="EQUALS">==</option>
                          <option value="CONTAINS">contains</option>
                        </select>
                        <input 
                          type="text" 
                          placeholder="Expected Code" 
                          value={newStepAssVal}
                          onChange={e => setNewStepAssVal(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-805 rounded px-1.5 py-1 font-mono text-[10.5px] text-zinc-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-zinc-900 pt-3">
                    <button 
                      type="button"
                      disabled={!newStepMethod}
                      onClick={handleAddStepToScenario}
                      className="px-4 py-1.5 font-mono font-bold text-xs rounded-lg text-zinc-955 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Append Step
                    </button>
                  </div>
                </div>
              </div>
            )}
            
          </div>

        </div>
      </div>
    </div>
  );
}
