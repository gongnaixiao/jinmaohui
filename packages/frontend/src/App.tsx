/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Project, 
  ScannedClass, 
  Scenario, 
  ScenarioStep, 
  EnvVar, 
  BuildHistoryRecord 
} from "@jarlink/shared";
import Header from "./components/Header";
import ClassScanner from "./components/ClassScanner";
import ApiDebugPlayground from "./components/ApiDebugPlayground";
import ScenarioOrchestrator from "./components/ScenarioOrchestrator";
import CallHistoryPanel from "./components/CallHistoryPanel";
import ProjectSettings from "./components/ProjectSettings";
import { 
  FolderGit, 
  Layers, 
  Terminal, 
  TrendingUp, 
  History, 
  Settings, 
  Plus, 
  RefreshCw, 
  Folder, 
  ChevronRight, 
  PlusCircle,
  HelpCircle,
  Hash
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [historyList, setHistoryList] = useState<BuildHistoryRecord[]>([]);

  // Navigation states
  const [activeTab, setActiveTab] = useState<"scan" | "debug" | "scenarios" | "history" | "settings">("scan");
  
  // Playground injection deep linking
  const [playgroundLinkClass, setPlaygroundLinkClass] = useState<string>("");
  const [playgroundLinkMethod, setPlaygroundLinkMethod] = useState<string>("");

  // Modals / Creators states
  const [isCreatingProj, setIsCreatingProj] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [loading, setLoading] = useState(true);

  const activeProject = projects.find(p => p.id === selectedProjectId);

  // Initial Boot Data Loading
  const fetchAllData = async () => {
    try {
      const projRes = await fetch("/api/projects");
      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData);
        
        // Select first project by default if empty
        if (projData.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projData[0].id);
        }
      }
    } catch (err) {
      console.error("Failed loading sandbox workspaces:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch histories and scenarios when project context shifts
  const fetchDependentData = async () => {
    if (!selectedProjectId) return;
    try {
      const [scenRes, histRes] = await Promise.all([
        fetch(`/api/projects/${selectedProjectId}/scenarios`),
        fetch(`/api/projects/${selectedProjectId}/history`)
      ]);

      if (scenRes.ok) {
        setScenarios(await scenRes.json());
      }
      if (histRes.ok) {
        setHistoryList(await histRes.json());
      }
    } catch (err) {
      console.error("Failed executing telemetry fetching sequence:", err);
    }
  };

  useEffect(() => {
    fetchDependentData();
    setPlaygroundLinkClass("");
    setPlaygroundLinkMethod("");
  }, [selectedProjectId]);

  // Project managers
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName) return;
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjName, description: newProjDesc })
      });
      if (res.ok) {
        const newlyCreated = await res.json();
        setProjects(prev => [...prev, newlyCreated]);
        setSelectedProjectId(newlyCreated.id);
        setNewProjName("");
        setNewProjDesc("");
        setIsCreatingProj(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        const rem = projects.filter(p => p.id !== selectedProjectId);
        setProjects(rem);
        setSelectedProjectId(rem[0]?.id || "");
        alert("Project runtime environment deleted.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Classpath operations
  const handleAddJar = async (name: string, mavenCoordinate?: string) => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/jars`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mavenCoordinate })
      });
      if (res.ok) {
        await fetchAllData(); // Reload classes metadata
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompileCustomClass = async (sourceCode: string) => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/custom-class`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCode })
      });
      if (res.ok) {
        await fetchAllData(); // Refresh list structure
      } else {
        const err = await res.json();
        throw new Error(err.error || "AST scan compilation rejected on platform backend.");
      }
    } catch (err: any) {
      alert("Compiler Error:\n" + err.message);
      throw err;
    }
  };

  // Scenarios managers
  const handleAddScenario = async (name: string, description: string, steps: ScenarioStep[]) => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/scenarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, steps })
      });
      if (res.ok) {
        await fetchDependentData(); // Sync scenarios list
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteScenario = async (id: string) => {
    try {
      const res = await fetch(`/api/scenarios/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchDependentData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteScenario = async (scenarioId: string) => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/scenarios/${scenarioId}/execute`, {
        method: "POST"
      });
      if (res.ok) {
        const logs = await res.json();
        // Shift call histories in side effect for instant audit traces log records
        fetchDependentData();
        return logs;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Config environment variables
  const handleUpdateEnvVars = async (envVars: EnvVar[]) => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/env`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ envVars })
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger from explorer select button to deep link debugger workspace
  const handleSelectMethodToPlay = (className: string, methodName: string) => {
    setPlaygroundLinkClass(className);
    setPlaygroundLinkMethod(className); // triggers sync effects
    setPlaygroundLinkMethod(methodName);
    setActiveTab("debug");
  };

  // Replay from history logs card back into dynamic calling inputs parameters
  const handleSelectReplayHistory = (className: string, methodName: string, paramJson: string) => {
    // Inject directly using linking references
    setPlaygroundLinkClass(className);
    setPlaygroundLinkMethod(methodName);
    setActiveTab("debug");
    
    // Tiny delay to ensure playground component syncs mount, handled inside state loaders and sync hooks!
    setTimeout(() => {
      const textarea = document.querySelector("textarea");
      if (textarea) {
        textarea.value = paramJson;
        // Dispatch synthetic change event to bind React State correctly
        const event = new Event("input", { bubbles: true });
        textarea.dispatchEvent(event);
      }
    }, 400);
  };

  // Calculate telemetry analytics dynamically
  const successCount = historyList.filter(h => h.result.status === "SUCCESS").length;
  const successRate = historyList.length > 0 ? Math.round((successCount / historyList.length) * 100) : 100;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Dynamic Telemetry Header Banner */}
      <Header 
        loadedJarsCount={activeProject?.jarFiles.length || 0}
        loadedClassesCount={activeProject?.classes.length || 0}
        successRate={successRate}
        totalCallsCount={historyList.length}
      />

      {/* Primary Workspace container */}
      <div className="flex-1 flex flex-col md:flex-row relative animate-fade-in">
        
        {/* LEFT BAR: Project Sidebar selectors (300px width) */}
        <div className="w-full md:w-64 border-r border-zinc-800 bg-zinc-950/20 py-5 px-4 flex flex-col gap-5 flex-shrink-0">
          <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
            <span className="text-xs font-mono font-bold uppercase text-zinc-400 flex items-center gap-1.5 font-bold">
              <FolderGit className="w-4 h-4 text-amber-500" />
              Runtime Classpaths
            </span>
            <button 
              onClick={() => setIsCreatingProj(!isCreatingProj)}
              className="text-amber-500 hover:text-amber-400 p-1 cursor-pointer transition-colors"
              title="Create new workspace environment"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Overlay Creator Form */}
          <AnimatePresence>
            {isCreatingProj && (
              <motion.form
                onSubmit={handleCreateProject}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-900 border border-zinc-805 rounded-xl p-3.5 flex flex-col gap-3"
              >
                <div>
                  <label className="text-[9.5px] font-mono text-zinc-400 block mb-1">Scope Title</label>
                  <input 
                    type="text" 
                    placeholder="E.g. Spring Boot App" 
                    required
                    value={newProjName}
                    onChange={e => setNewProjName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-mono text-zinc-400 block mb-1">Description (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Short summary..." 
                    value={newProjDesc}
                    onChange={e => setNewProjDesc(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>
                <div className="flex gap-2 justify-end mt-1">
                  <button 
                    type="button" 
                    onClick={() => setIsCreatingProj(false)} 
                    className="text-xs font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-3 py-1 font-mono font-bold text-xs rounded bg-amber-500 text-zinc-950 hover:bg-amber-400 cursor-pointer"
                  >
                    Bootstrap
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Projects lists */}
          <div className="flex flex-col gap-1.5 max-h-56 md:max-h-none overflow-y-auto pr-1">
            {loading ? (
              <span className="text-xs text-zinc-650 font-mono italic flex items-center justify-center py-4">
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> Synchronizing...
              </span>
            ) : projects.length === 0 ? (
              <span className="text-xs text-zinc-500 font-mono italic">No classpath workspaces built. Click + to begin.</span>
            ) : (
              projects.map(p => {
                const isSelected = p.id === selectedProjectId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProjectId(p.id);
                      setPlaygroundLinkClass("");
                      setPlaygroundLinkMethod("");
                    }}
                    className={`w-full text-left rounded-xl px-3.5 py-2.5 border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected 
                        ? "bg-zinc-900 border-zinc-700 text-amber-500 shadow-[0_4px_12px_rgba(0,0,0,0.5)]" 
                        : "bg-transparent border-transparent hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-mono font-bold block truncate">{p.name}</span>
                      <span className="text-[10px] text-zinc-500 font-sans block truncate leading-normal">
                        {p.jarFiles?.length || 0} Modules configured
                      </span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-amber-500" : "text-zinc-650"}`} />
                  </button>
                );
              })
            )}
          </div>

          {/* Quick instructions panel inside sidebar */}
          <div className="hidden md:flex flex-col gap-2 p-3.5 mt-auto rounded-xl bg-zinc-900/20 border border-zinc-800 text-[10.5px] text-zinc-500 font-sans leading-relaxed">
            <span className="font-mono font-bold text-zinc-400 block mb-0.5">Quick Guide</span>
            <div>1. View scanned API definitions inside scanner.</div>
            <div>2. Code or compile custom Java classes payload to inspect methods dynamically.</div>
            <div>3. Fill mock arguments and trigger virtual dynamic test executions.</div>
            <div>4. Sequence step pipelines inside Scenario orchester suites.</div>
          </div>
        </div>

        {/* RIGHT AREA: Main Cockpit content tabs */}
        <div className="flex-1 flex flex-col min-w-0 bg-zinc-900/10">
          
          {/* Navigation Tab Bar Controls */}
          <div className="border-b border-zinc-800 px-6 py-2 flex items-center justify-between gap-4 font-mono select-none overflow-x-auto">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setActiveTab("scan")}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  activeTab === "scan" ? "text-amber-500 bg-zinc-900 border border-zinc-800" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5 inline mr-1.5" />
                Scanned APIs 
              </button>

              <button 
                onClick={() => setActiveTab("debug")}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  activeTab === "debug" ? "text-amber-500 bg-zinc-900 border border-zinc-800" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Terminal className="w-3.5 h-3.5 inline mr-1.5" />
                Invoke Debugger
              </button>

              <button 
                onClick={() => setActiveTab("scenarios")}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  activeTab === "scenarios" ? "text-amber-500 bg-zinc-900 border border-zinc-800" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />
                Scenario Orchestrator
              </button>

              <button 
                onClick={() => setActiveTab("history")}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors relative ${
                  activeTab === "history" ? "text-amber-500 bg-zinc-900 border border-zinc-800" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <History className="w-3.5 h-3.5 inline mr-1.5" />
                Call Traces History
                {historyList.length > 0 && (
                  <span className="absolute top-1.5 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                )}
              </button>

              <button 
                onClick={() => setActiveTab("settings")}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                  activeTab === "settings" ? "text-amber-500 bg-zinc-900 border border-zinc-800" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Settings className="w-3.5 h-3.5 inline mr-1.5" />
                Environment Settings
              </button>
            </div>

            {activeProject && (
              <span className="text-[10.5px] text-zinc-505 hidden lg:inline-block bg-zinc-950 px-2 py-1 rounded border border-zinc-900">
                Workspace ID: <strong className="text-zinc-400">{activeProject.id}</strong>
              </span>
            )}
          </div>

          {/* Active Workspace screens renders */}
          <div className="flex-1 overflow-y-auto">
            {activeProject ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ ease: "easeInOut", duration: 0.15 }}
                  className="h-full"
                >
                  {activeTab === "scan" && (
                    <ClassScanner 
                      project={activeProject}
                      onAddJar={handleAddJar}
                      onCompileCustomClass={handleCompileCustomClass}
                      onSelectMethod={handleSelectMethodToPlay}
                    />
                  )}

                  {activeTab === "debug" && (
                    <ApiDebugPlayground 
                      project={activeProject}
                      initialClassPath={playgroundLinkClass}
                      initialMethodName={playgroundLinkMethod}
                      onSaveScenarioStep={(stepData) => {
                        // Automatically bind to first scenario or create template
                        if (scenarios.length === 0) {
                          handleAddScenario("New Scenario Custom Run", "Workflow compiled from active playground state.", [
                            {
                              id: "step-" + Date.now(),
                              name: stepData.name,
                              targetClass: stepData.targetClass,
                              targetMethod: stepData.targetMethod,
                              argumentsJson: stepData.argumentsJson,
                              extractedVariables: [],
                              assertions: [{ jsonPath: "$.status", operator: "EQUALS", expectedValue: "SUCCESS" }]
                            }
                          ]);
                        } else {
                          // Update active scenario steps on backend directly
                          const activeS = scenarios[0];
                          const stepId = "step-" + Date.now();
                          const updated = [...activeS.steps, {
                            id: stepId,
                            name: stepData.name,
                            targetClass: stepData.targetClass,
                            targetMethod: stepData.targetMethod,
                            argumentsJson: stepData.argumentsJson,
                            extractedVariables: [],
                            assertions: [{ jsonPath: "$.status", operator: "EQUALS", expectedValue: "SUCCESS" }]
                          } as ScenarioStep];
                          
                          fetch(`/api/scenarios/${activeS.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ steps: updated })
                          }).then(res => {
                            if (res.ok) {
                              fetchDependentData();
                              alert(`Appended step successfully to scenario: "${activeS.name}"`);
                            }
                          });
                        }
                      }}
                    />
                  )}

                  {activeTab === "scenarios" && (
                    <ScenarioOrchestrator 
                      project={activeProject}
                      scenarios={scenarios}
                      onAddScenario={handleAddScenario}
                      onDeleteScenario={handleDeleteScenario}
                      onExecuteScenario={handleExecuteScenario}
                    />
                  )}

                  {activeTab === "history" && (
                    <CallHistoryPanel 
                      historyList={historyList}
                      onSelectReplayHistory={handleSelectReplayHistory}
                    />
                  )}

                  {activeTab === "settings" && (
                    <ProjectSettings 
                      project={activeProject}
                      onUpdateEnvVars={handleUpdateEnvVars}
                      onDeleteProject={handleDeleteProject}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-32 font-mono">
                <Folder className="w-12 h-12 text-zinc-700 animate-pulse" />
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold text-zinc-300">Awaiting classpath bootstrap setup</span>
                  <p className="text-xs text-zinc-500 leading-normal max-w-sm">No workspace is active in Sandboxed JVM Classloader context. Click + on the sidebar list to boot a project classpath.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingProj(true)}
                  className="px-5 py-2.5 font-mono font-bold text-xs text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-xl cursor-pointer"
                >
                  Create Classpath environment
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
