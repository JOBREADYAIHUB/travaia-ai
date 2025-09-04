import { useState, useRef, useCallback, useEffect } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatMessagesView } from "@/components/ChatMessagesView";
import { LoginPage } from "@/components/LoginPage";
import { auth } from "./firebase";
import type { User } from "firebase/auth";

type DisplayData = string | null;

interface MessageWithAgent {
  type: "human" | "ai";
  content: string;
  id: string;
  agent?: string;
  finalReportWithCitations?: boolean;
}

interface FunctionCallData {
  type: "functionCall";
  name: string;
  args: Record<string, unknown>;
  id: string;
}

interface FunctionResponseData {
  type: "functionResponse";
  name: string;
  response: Record<string, unknown>;
  id: string;
}

interface TextData {
  type: "text";
  content: string;
}

interface SourcesData {
  type: "sources";
  content: unknown;
}

interface ContentPart {
  text?: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
    id?: string;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
    id?: string;
  };
}

type ProcessedEventData =
  | FunctionCallData
  | FunctionResponseData
  | TextData
  | SourcesData;

interface ProcessedEvent {
  title: string;
  data: ProcessedEventData;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [appName, setAppName] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<"app" | "chatbot">("app");
  const [messages, setMessages] = useState<MessageWithAgent[]>([]);
  const [displayData, setDisplayData] = useState<DisplayData>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messageEvents, setMessageEvents] = useState<Map<string, ProcessedEvent[]>>(new Map());
  const [websiteCount, setWebsiteCount] = useState<number>(0);
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);

  const currentAgentRef = useRef<string>("");
  const accumulatedTextRef = useRef<string>("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
  };

  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    maxRetries: number = 10,
    maxDuration: number = 120000
  ): Promise<T> => {
    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (Date.now() - startTime > maxDuration) {
        throw new Error(`Retry timeout after ${maxDuration}ms`);
      }

      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  };

  const createSession = useCallback(
    async (): Promise<{ userId: string; sessionId: string; appName: string }> => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const idToken = await user.getIdToken();

      const response = await fetch(
        `/api/apps/${selectedAgent}/users/${user.uid}/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to create session: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return {
        userId: data.userId,
        sessionId: data.id,
        appName: data.appName,
      };
    },
    [user, selectedAgent]
  );

  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/docs", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.ok;
    } catch (error) {
      console.log("Backend not ready yet:", error);
      return false;
    }
  };

  // ----------------------
  // SSE DATA EXTRACTION
  // ----------------------
  const extractDataFromSSE = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      console.log("[SSE PARSED EVENT]:", JSON.stringify(parsed, null, 2));

      let textParts: string[] = [];
      let agent = "";
      let finalReportWithCitations = undefined;
      let functionCall: FunctionCallData | null = null;
      let functionResponse: FunctionResponseData | null = null;
      let sources: unknown | null = null;

      if (parsed.content && parsed.content.parts) {
        textParts = parsed.content.parts
          .filter((part: ContentPart) => part.text)
          .map((part: ContentPart) => part.text!);

        const functionCallPart = parsed.content.parts.find(
          (part: ContentPart) => part.functionCall
        );
        if (functionCallPart && functionCallPart.functionCall) {
          functionCall = {
            type: "functionCall",
            name: functionCallPart.functionCall.name,
            args: functionCallPart.functionCall.args,
            id: functionCallPart.functionCall.id || `fc-${Date.now()}`,
          };
        }

        const functionResponsePart = parsed.content.parts.find(
          (part: ContentPart) => part.functionResponse
        );
        if (functionResponsePart && functionResponsePart.functionResponse) {
          functionResponse = {
            type: "functionResponse",
            name: functionResponsePart.functionResponse.name,
            response: functionResponsePart.functionResponse.response,
            id: functionResponsePart.functionResponse.id || `fr-${Date.now()}`,
          };
        }
      }

      if (parsed.author) {
        agent = parsed.author;
      }

      if (
        parsed.actions?.stateDelta?.final_report_with_citations
      ) {
        finalReportWithCitations =
          parsed.actions.stateDelta.final_report_with_citations;
      }

      let sourceCount = 0;
      if (
        parsed.author === "section_researcher" ||
        parsed.author === "enhanced_search_executor"
      ) {
        if (parsed.actions?.stateDelta?.url_to_short_id) {
          sourceCount = Object.keys(
            parsed.actions.stateDelta.url_to_short_id
          ).length;
        }
      }

      if (parsed.actions?.stateDelta?.sources) {
        sources = parsed.actions.stateDelta.sources;
      }

      return {
        textParts,
        agent,
        finalReportWithCitations,
        functionCall,
        functionResponse,
        sourceCount,
        sources,
      };
    } catch (error) {
      const truncatedData =
        data.length > 200 ? data.substring(0, 200) + "..." : data;
      console.error(
        "Error parsing SSE data. Raw data (truncated): ",
        truncatedData,
        error
      );
      return {
        textParts: [],
        agent: "",
        finalReportWithCitations: undefined,
        functionCall: null,
        functionResponse: null,
        sourceCount: 0,
        sources: null,
      };
    }
  };

  const getEventTitle = (agentName: string): string => {
    switch (agentName) {
      case "plan_generator":
        return "Planning Research Strategy";
      case "section_planner":
        return "Structuring Report Outline";
      case "section_researcher":
        return "Initial Web Research";
      case "research_evaluator":
        return "Evaluating Research Quality";
      case "EscalationChecker":
        return "Quality Assessment";
      case "enhanced_search_executor":
        return "Enhanced Web Research";
      case "research_pipeline":
        return "Executing Research Pipeline";
      case "iterative_refinement_loop":
        return "Refining Research";
      case "interactive_planner_agent":
      case "root_agent":
        return "Interactive Planning";
      default:
        return `Processing (${agentName || "Unknown Agent"})`;
    }
  };

  const processSseEventData = useCallback(
    (jsonData: string, aiMessageId: string) => {
      const {
        textParts,
        agent,
        finalReportWithCitations,
        functionCall,
        functionResponse,
        sourceCount,
        sources,
      } = extractDataFromSSE(jsonData);

      if (sourceCount > 0) {
        setWebsiteCount((prev) => Math.max(prev, sourceCount));
      }

      if (agent && agent !== currentAgentRef.current) {
        currentAgentRef.current = agent;
      }

      if (functionCall) {
        setMessageEvents((prev) =>
          new Map(prev).set(aiMessageId, [
            ...(prev.get(aiMessageId) || []),
            { title: `Function Call: ${functionCall.name}`, data: functionCall },
          ])
        );
      }

      if (functionResponse) {
        setMessageEvents((prev) =>
          new Map(prev).set(aiMessageId, [
            ...(prev.get(aiMessageId) || []),
            {
              title: `Function Response: ${functionResponse.name}`,
              data: functionResponse,
            },
          ])
        );
      }

      if (textParts.length > 0 && agent !== "report_composer_with_citations") {
        if (agent !== "interactive_planner_agent") {
          const eventTitle = getEventTitle(agent);
          setMessageEvents((prev) =>
            new Map(prev).set(aiMessageId, [
              ...(prev.get(aiMessageId) || []),
              {
                title: eventTitle,
                data: { type: "text", content: textParts.join(" ") },
              },
            ])
          );
        } else {
          for (const text of textParts) {
            accumulatedTextRef.current += text + " ";
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessageId
                  ? {
                      ...msg,
                      content: accumulatedTextRef.current.trim(),
                      agent: currentAgentRef.current || msg.agent,
                    }
                  : msg
              )
            );
            setDisplayData(accumulatedTextRef.current.trim());
          }
        }
      }

      if (sources) {
        setMessageEvents((prev) =>
          new Map(prev).set(aiMessageId, [
            ...(prev.get(aiMessageId) || []),
            { title: "Retrieved Sources", data: { type: "sources", content: sources } },
          ])
        );
      }

      if (agent === "report_composer_with_citations" && finalReportWithCitations) {
        const finalReportMessageId = Date.now().toString() + "_final";
        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content: finalReportWithCitations as string,
            id: finalReportMessageId,
            agent: currentAgentRef.current,
            finalReportWithCitations: true,
          },
        ]);
        setDisplayData(finalReportWithCitations as string);
      }
    },
    []
  );

  // ----------------------
  // HANDLE SUBMIT
  // ----------------------
  const handleSubmit = useCallback(
    async (query: string) => {
      if (!user) return;
      if (!query.trim()) return;

      setIsLoading(true);
      try {
        let currentUserId = userId;
        let currentSessionId = sessionId;
        let currentAppName = appName;

        if (!currentSessionId || !currentUserId || !currentAppName) {
          const sessionData = await retryWithBackoff(createSession);
          currentUserId = sessionData.userId;
          currentSessionId = sessionData.sessionId;
          currentAppName = sessionData.appName;

          setUserId(currentUserId);
          setSessionId(currentSessionId);
          setAppName(currentAppName);
        }

        const userMessageId = Date.now().toString();
        setMessages((prev) => [
          ...prev,
          { type: "human", content: query, id: userMessageId },
        ]);

        const aiMessageId = Date.now().toString() + "_ai";
        currentAgentRef.current = "";
        accumulatedTextRef.current = "";

        setMessages((prev) => [
          ...prev,
          { type: "ai", content: "", id: aiMessageId, agent: "" },
        ]);

        const sendMessage = async () => {
          const idToken = await user.getIdToken();

          const response = await fetch("/api/run_sse", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              appName: currentAppName,
              userId: currentUserId,
              sessionId: currentSessionId,
              newMessage: {
                parts: [{ text: query }],
                role: "user",
              },
              streaming: false,
            }),
          });

          if (!response.ok) {
            throw new Error(
              `Failed to send message: ${response.status} ${response.statusText}`
            );
          }

          return response;
        };

        const response = await retryWithBackoff(sendMessage);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let lineBuffer = "";
        let eventDataBuffer = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();

            if (value) {
              lineBuffer += decoder.decode(value, { stream: true });
            }

            let eolIndex;
            while (
              (eolIndex = lineBuffer.indexOf("\n")) >= 0 ||
              (done && lineBuffer.length > 0)
            ) {
              let line: string;
              if (eolIndex >= 0) {
                line = lineBuffer.substring(0, eolIndex);
                lineBuffer = lineBuffer.substring(eolIndex + 1);
              } else {
                line = lineBuffer;
                lineBuffer = "";
              }

              if (line.trim() === "") {
                if (eventDataBuffer.length > 0) {
                  const jsonDataToParse = eventDataBuffer.endsWith("\n")
                    ? eventDataBuffer.slice(0, -1)
                    : eventDataBuffer;
                  processSseEventData(jsonDataToParse, aiMessageId);
                  eventDataBuffer = "";
                }
              } else if (line.startsWith("data:")) {
                eventDataBuffer += line.substring(5).trimStart() + "\n";
              }
            }

            if (done) {
              if (eventDataBuffer.length > 0) {
                const jsonDataToParse = eventDataBuffer.endsWith("\n")
                  ? eventDataBuffer.slice(0, -1)
                  : eventDataBuffer;
                processSseEventData(jsonDataToParse, aiMessageId);
                eventDataBuffer = "";
              }
              break;
            }
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error:", error);
        const aiMessageId = Date.now().toString() + "_ai_error";
        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content: `Sorry, there was an error processing your request: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            id: aiMessageId,
          },
        ]);
        setIsLoading(false);
      }
    },
    [processSseEventData, user, userId, sessionId, appName, createSession]
  );

  // ----------------------
  // BACKEND HEALTH CHECK
  // ----------------------
  useEffect(() => {
    const checkBackend = async () => {
      setIsCheckingBackend(true);

      const maxAttempts = 60;
      let attempts = 0;

      while (attempts < maxAttempts) {
        const isReady = await checkBackendHealth();
        if (isReady) {
          setIsBackendReady(true);
          setIsCheckingBackend(false);
          return;
        }
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      setIsCheckingBackend(false);
      console.error("Backend failed to start within 2 minutes");
    };

    checkBackend();
  }, []);

  const handleCancel = useCallback(() => {
    setMessages([]);
    setDisplayData(null);
    setMessageEvents(new Map());
    setWebsiteCount(0);
    window.location.reload();
  }, []);

  const handleAgentChange = (agent: "app" | "chatbot") => {
    if (agent !== selectedAgent) {
      setSelectedAgent(agent);
      setMessages([]);
      setDisplayData(null);
      setMessageEvents(new Map());
      setWebsiteCount(0);
      setSessionId(null);
      setUserId(null);
      setAppName(null);
    }
  };

  // ----------------------
  // AUTO SCROLL
  // ----------------------
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);


  const BackendLoadingScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative">
      <div className="w-full max-w-2xl z-10
                      bg-neutral-900/50 backdrop-blur-md 
                      p-8 rounded-2xl border border-neutral-700 
                      shadow-2xl shadow-black/60">
        
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3">
            ✨ Gemini FullStack - ADK 🚀
          </h1>
          
          <div className="flex flex-col items-center space-y-4">
            {/* Spinning animation */}
            <div className="relative">
              <div className="w-16 h-16 border-4 border-neutral-600 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            </div>
            
            <div className="space-y-2">
              <p className="text-xl text-neutral-300">
                Waiting for backend to be ready...
              </p>
              <p className="text-sm text-neutral-400">
                This may take a moment on first startup
              </p>
            </div>
            
            {/* Animated dots */}
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return <LoginPage onLoginSuccess={() => {
      const currentUser = auth.currentUser;
      setUser(currentUser);
    }} />;
  }

  return (
    <div className="flex h-screen bg-neutral-800 text-neutral-100 font-sans antialiased">
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <div className="p-4 border-b border-neutral-700 flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => handleAgentChange("app")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedAgent === "app"
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-700 hover:bg-neutral-600"
              }`}
            >
              App Agent
            </button>
            <button
              onClick={() => handleAgentChange("chatbot")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedAgent === "chatbot"
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-700 hover:bg-neutral-600"
              }`}
            >
              Chatbot Agent
            </button>
          </div>
        </div>
        <div className={`flex-1 overflow-y-auto ${(messages.length === 0 || isCheckingBackend) ? "flex" : ""}`}>
          {isCheckingBackend ? (
            <BackendLoadingScreen />
          ) : !isBackendReady ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-red-400">Backend Unavailable</h2>
                <p className="text-neutral-300">
                  Unable to connect to backend services at localhost:8000
                </p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <WelcomeScreen
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              onCancel={handleCancel}
            />
          ) : (
            <ChatMessagesView
              messages={messages}
              isLoading={isLoading}
              scrollAreaRef={scrollAreaRef}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              onLogout={handleLogout}
              displayData={displayData}
              messageEvents={messageEvents}
              websiteCount={websiteCount}
            />
          )}
        </div>
      </main>
    </div>
  );
}