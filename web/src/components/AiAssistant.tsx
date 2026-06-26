import { useState, useEffect, useRef } from "react";
import { api, AiChatSession, AiChatMessage } from "../lib/api";
import {
  MessageSquare, Send, Trash2, Plus, Loader2, Bot, User, X,
} from "lucide-react";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string;
  currentPageId?: string;
  currentPageTitle?: string;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AiAssistant({ userId, currentPageId, currentPageTitle, onClose }: Props) {
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [configValues, setConfigValues] = useState<Record<string, string>>({
    provider: "", api_url: "", api_key: "", model: "", system_prompt: "",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
    loadConfig();
  }, [userId]);

  // Load messages when active session changes
  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSessions = async () => {
    try {
      const s = await api.ai.sessions.list(userId);
      setSessions(s);
      if (s.length > 0 && !activeSessionId) {
        setActiveSessionId(s[0].id);
      }
    } catch (err) {
      console.error("Failed to load AI sessions:", err);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const msgs = await api.ai.messages.list(sessionId);
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const loadConfig = async () => {
    try {
      const all = await api.ai.config.getAll();
      const vals: Record<string, string> = {};
      for (const c of all) vals[c.key] = c.value;
      setConfigValues(vals);
    } catch (err) {
      console.error("Failed to load AI config:", err);
    }
  };

  const handleNewSession = async () => {
    try {
      const title = currentPageTitle
        ? `Chat about "${currentPageTitle}"`
        : `Chat ${new Date().toLocaleString()}`;
      const id = await api.ai.sessions.create(
        userId,
        title,
        currentPageId || "",
      );
      setSessions(prev => [{ id, user_id: userId, title, page_context_id: currentPageId || "", created_at: Date.now(), updated_at: Date.now() }, ...prev]);
      setActiveSessionId(id);
      setMessages([]);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await api.ai.sessions.delete(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(sessions.length > 1 ? sessions[0].id : null);
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeSessionId || loading) return;
    setInput("");
    setError(null);

    // Add user message locally immediately
    const userMsg: AiChatMessage = {
      id: "temp_" + Date.now(),
      session_id: activeSessionId,
      role: "user",
      content: text,
      created_at: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Save user message to STDB
      await api.ai.messages.add(activeSessionId, "user", text);

      // Get AI response
      const response = await api.ai.ask(activeSessionId, text, currentPageId);

      // Save AI response
      await api.ai.messages.add(activeSessionId, "assistant", response);

      // Reload messages to get proper IDs
      await loadMessages(activeSessionId);
    } catch (err) {
      setError(String(err));
      // Add error message placeholder
      const errMsg: AiChatMessage = {
        id: "err_" + Date.now(),
        session_id: activeSessionId,
        role: "assistant",
        content: `⚠️ Error: ${String(err)}`,
        created_at: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const saveConfig = async (key: string, value: string) => {
    try {
      await api.ai.config.set(key, value);
      setConfigValues(prev => ({ ...prev, [key]: value }));
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="fixed bottom-0 right-0 z-50 w-[420px] max-w-full h-[600px] max-h-[80vh] bg-[#1a1a2e] border border-[#2a2a4a] rounded-tl-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a4a] bg-[#16162a] shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-[#6c5ce7]" />
          <span className="font-semibold text-sm text-white">AI Assistant</span>
          {currentPageTitle && (
            <span className="text-xs text-gray-400 truncate max-w-[180px]">
              · {currentPageTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className="p-1.5 hover:bg-[#2a2a4a] rounded text-gray-400 hover:text-white transition-colors text-xs"
            title="AI Settings"
          >
            ⚙️
          </button>
          <button
            onClick={handleNewSession}
            className="p-1.5 hover:bg-[#2a2a4a] rounded text-gray-400 hover:text-white transition-colors"
            title="New chat"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#2a2a4a] rounded text-gray-400 hover:text-white transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Config panel */}
      {configOpen && (
        <div className="px-4 py-3 border-b border-[#2a2a4a] bg-[#12122a] space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-gray-400 block mb-1">Provider</label>
              <select
                value={configValues.provider}
                onChange={(e) => saveConfig("provider", e.target.value)}
                className="w-full bg-[#1a1a2e] border border-[#2a2a4a] rounded px-2 py-1.5 text-white text-xs"
              >
                <option value="">Ollama (local)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="custom">Custom (OpenAI-compatible)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-gray-400 block mb-1">API URL (default: http://localhost:11434)</label>
              <input
                value={configValues.api_url}
                onChange={(e) => setConfigValues(prev => ({ ...prev, api_url: e.target.value }))}
                onBlur={(e) => saveConfig("api_url", e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full bg-[#1a1a2e] border border-[#2a2a4a] rounded px-2 py-1.5 text-white text-xs"
              />
            </div>
            <div className="col-span-2">
              <label className="text-gray-400 block mb-1">Model</label>
              <input
                value={configValues.model}
                onChange={(e) => setConfigValues(prev => ({ ...prev, model: e.target.value }))}
                onBlur={(e) => saveConfig("model", e.target.value)}
                placeholder="llama3.2"
                className="w-full bg-[#1a1a2e] border border-[#2a2a4a] rounded px-2 py-1.5 text-white text-xs"
              />
            </div>
            <div className="col-span-2">
              <label className="text-gray-400 block mb-1">API Key (for OpenAI/Anthropic)</label>
              <input
                type="password"
                value={configValues.api_key}
                onChange={(e) => setConfigValues(prev => ({ ...prev, api_key: e.target.value }))}
                onBlur={(e) => saveConfig("api_key", e.target.value)}
                placeholder="sk-..."
                className="w-full bg-[#1a1a2e] border border-[#2a2a4a] rounded px-2 py-1.5 text-white text-xs"
              />
            </div>
            <div className="col-span-2">
              <label className="text-gray-400 block mb-1">System Prompt</label>
              <textarea
                value={configValues.system_prompt}
                onChange={(e) => setConfigValues(prev => ({ ...prev, system_prompt: e.target.value }))}
                onBlur={(e) => saveConfig("system_prompt", e.target.value)}
                placeholder="You are a helpful wiki assistant..."
                rows={2}
                className="w-full bg-[#1a1a2e] border border-[#2a2a4a] rounded px-2 py-1.5 text-white text-xs resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sessions bar */}
      {sessions.length > 0 && !configOpen && (
        <div className="px-3 py-2 border-b border-[#2a2a4a] bg-[#12122a] flex gap-1 overflow-x-auto shrink-0">
          {sessions.slice(0, 5).map(session => (
            <button
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={`text-xs px-2 py-1 rounded whitespace-nowrap shrink-0 transition-colors ${
                activeSessionId === session.id
                  ? "bg-[#6c5ce7] text-white"
                  : "bg-[#1a1a2e] text-gray-400 hover:text-white"
              }`}
            >
              <MessageSquare size={10} className="inline mr-1" />
              {session.title.slice(0, 24)}
              {session.title.length > 24 ? "…" : ""}
            </button>
          ))}
          {sessions.length > 5 && (
            <span className="text-xs text-gray-500 self-center">+{sessions.length - 5}</span>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {!activeSessionId && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
            <Bot size={48} className="mb-3 text-[#6c5ce7]" />
            <p className="mb-1">Ask questions about your wiki content</p>
            <p className="text-xs text-gray-600 mb-4">
              Powered by Ollama, OpenAI, or any OpenAI-compatible API
            </p>
            <button
              onClick={handleNewSession}
              className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] rounded-lg text-white text-sm font-medium transition-colors"
            >
              <Plus size={14} className="inline mr-1.5" />
              Start a new chat
            </button>
          </div>
        )}

        {activeSessionId && messages.length === 0 && !loading && (
          <div className="text-center text-gray-500 text-sm py-8">
            <p className="mb-2">Ask anything about your wiki content.</p>
            <p className="text-xs text-gray-600">
              {currentPageTitle
                ? `Context: "${currentPageTitle}" will be included automatically.`
                : "Open a page to include it as context for the AI."}
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role !== "user" && (
              <div className="w-7 h-7 rounded-full bg-[#2a2a4a] flex items-center justify-center shrink-0 mt-1">
                <Bot size={14} className="text-[#6c5ce7]" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[#6c5ce7] text-white rounded-tr-none"
                  : "bg-[#2a2a4a] text-gray-200 rounded-tl-none"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-[#6c5ce7] flex items-center justify-center shrink-0 mt-1">
                <User size={14} className="text-white" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-[#2a2a4a] flex items-center justify-center shrink-0">
              <Bot size={14} className="text-[#6c5ce7]" />
            </div>
            <div className="bg-[#2a2a4a] rounded-lg rounded-tl-none px-4 py-3">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-400 text-xs px-2 py-1 bg-red-900/20 rounded">
            {error}
            <button onClick={() => setError(null)} className="ml-2 hover:text-red-300">
              <X size={12} className="inline" />
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#2a2a4a] bg-[#16162a] shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeSessionId ? "Ask a question… (Enter to send, Shift+Enter for newline)" : "Start a chat first..."}
            rows={1}
            disabled={!activeSessionId || loading}
            className="flex-1 bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-[#6c5ce7] disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !activeSessionId || loading}
            className="p-2 bg-[#6c5ce7] hover:bg-[#5a4bd1] disabled:bg-[#2a2a4a] disabled:text-gray-500 rounded-lg text-white transition-colors self-end"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
