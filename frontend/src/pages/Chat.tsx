import React, { useState, useEffect, useRef } from 'react';
import api from '../../axios';
import { useAuthStore } from '../store/useAuthStore';

interface Source {
  pageContent: string;
  metadata: {
    loc?: {
      pageNumber?: number;
    };
    pageNumber?: number;
    [key: string]: any;
  };
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  sources?: Source[];
}

interface Document {
  _id: string;
  title: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const isRequestingRef = useRef(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(false);
  const [isSpeechSynthesisSupported, setIsSpeechSynthesisSupported] = useState(false);
  const [saveHistory, setSaveHistory] = useState(true);
  const token = useAuthStore((state: any) => state.token) || localStorage.getItem('token');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetchDocuments();
    fetchChatHistory();

    // On component unmount, cancel any ongoing speech
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
           setInput((prev) => prev + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
    
    // Text-to-Speech (Output) support check
    if ('speechSynthesis' in window) {
      setIsSpeechSynthesisSupported(true);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error('Speech recognition failed to start.', e);
      }
    }
  };

  const speak = (text: string) => {
    if (!isSpeechSynthesisSupported || !isVoiceOutputEnabled) return;

    window.speechSynthesis.cancel(); // Stop any previous speech
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  // Auto-scroll to the bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents');
      setDocuments(res.data);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const res = await api.get('/chat/history');
      if (res.data && res.data.messages) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch chat history', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isRequestingRef.current) return;

    // Stop any speaking when user sends a new message
    if (isSpeechSynthesisSupported) {
      window.speechSynthesis.cancel();
    }

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);
    setError('');
    isRequestingRef.current = true;

    const aiMessageId = (Date.now() + 1).toString();
    let messageAdded = false;
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || api.defaults.baseURL || 'http://localhost:5000/api/v1';
      const authHeader = token ? `Bearer ${token}` : ((api.defaults.headers.common['Authorization'] as string) || '');
      
      const response = await fetch(`${baseURL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          question: userMessage.content,
          documentId: selectedDocumentId || undefined,
          save: saveHistory,
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || errData?.message || `HTTP Error ${response.status}`);
      }

      if (!response.body) throw new Error('ReadableStream not supported.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let aiContent = '';
      let buffer = '';

      let streamFinished = false;
      while (!streamFinished) {
        const { done, value } = await reader.read();
        if (done) {
          streamFinished = true;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const dataStr = part.replace('data: ', '');
            if (dataStr === '[DONE]') {
              streamFinished = true;
              break;
            }
            
            let parsed;
            try {
              parsed = JSON.parse(dataStr);
            } catch (e) {
              console.error('Failed to parse SSE chunk', e);
              continue;
            }

            if (!messageAdded) {
              setMessages((prev) => [...prev, { id: aiMessageId, role: 'ai', content: '', sources: [] }]);
              messageAdded = true;
              setIsTyping(false);
            }

            if (parsed.type === 'sources') {
              setMessages((prev) => prev.map(msg => msg.id === aiMessageId ? { ...msg, sources: parsed.data } : msg));
            } else if (parsed.type === 'chunk') {
              aiContent += parsed.data;
              setMessages((prev) => prev.map(msg => msg.id === aiMessageId ? { ...msg, content: aiContent } : msg));
            } else if (parsed.type === 'error') {
              throw new Error(parsed.data);
            }
          }
        }
      }
      
      speak(aiContent);
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to get a response from the AI.';
      if (errorMessage.toLowerCase().includes('rate limit') || errorMessage.includes('429')) {
        errorMessage = 'AI service is currently busy. Your request has been queued and will automatically retry.';
      }
      console.error('[DEBUG Frontend] Chat Error:', err.message || errorMessage);
      
      if (!messageAdded) {
        setMessages((prev) => [...prev, { id: aiMessageId, role: 'ai', content: `Error: ${errorMessage}` }]);
        messageAdded = true;
      } else {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === aiMessageId ? { ...msg, content: `Error: ${errorMessage}` } : msg))
        );
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      isRequestingRef.current = false;
    }
  };

  const handleClearChat = async () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      try {
        await api.delete('/chat/history');
        setMessages([]);
        setError('');
      } catch (err) {
        console.error('Failed to clear chat history', err);
        setError('Failed to clear chat history.');
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-2 md:p-4 h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] mt-12 md:mt-0">
      <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
        {/* Header & Document Selector */}
        <div className="p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3 sm:gap-0 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate w-full sm:w-auto">Study Assistant</h2>
          <div className="flex items-center space-x-2 md:space-x-4 w-full sm:w-auto justify-between sm:justify-end">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="px-3 py-2 rounded-md transition-colors border shadow-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800"
                title="Clear Chat History"
              >
                🗑️
              </button>
            )}
            {isSpeechSynthesisSupported && (
              <button
                type="button"
                onClick={() => setIsVoiceOutputEnabled(prev => !prev)}
                className={`px-3 py-2 rounded-md transition-colors border shadow-sm ${
                  isVoiceOutputEnabled ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 dark:border-blue-700 text-blue-600 dark:text-blue-300' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                title={isVoiceOutputEnabled ? "Disable voice output" : "Enable voice output"}
              >
                {isVoiceOutputEnabled ? '🔊' : '🔇'}
              </button>
            )}
            <select
              value={selectedDocumentId}
              onChange={(e) => setSelectedDocumentId(e.target.value)}
              className="block w-full sm:w-48 md:w-64 pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md transition-colors shadow-sm"
            >
              <option value="">All Documents (General Knowledge)</option>
              {documents.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-6 bg-gray-50 dark:bg-gray-900 transition-colors">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
              <p>Start asking questions about your study materials!</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
              className={`max-w-[90%] md:max-w-[80%] rounded-2xl px-4 md:px-5 py-3 shadow-sm ${
                  msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              
              {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Sources:</p>
                  <div className="space-y-2">
                    {msg.sources.map((source, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-xs border border-gray-200 dark:border-gray-700 shadow-sm">
                        <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">
                          Page {source.metadata?.pageNumber || source.metadata?.loc?.pageNumber || 'N/A'}
                        </span>
                        <p className="text-gray-600 dark:text-gray-400 italic line-clamp-3">"{source.pageContent}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-none px-5 py-4 text-sm shadow-sm flex items-center space-x-2">
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          )}
          {error && <div className="text-center text-sm font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg mx-auto max-w-md border border-red-200 dark:border-red-800">{error}</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
          <div className="flex items-center justify-end mb-3 mr-2 space-x-2">
            <input type="checkbox" id="saveHistory" checked={saveHistory} onChange={e => setSaveHistory(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" />
            <label htmlFor="saveHistory" className="text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer select-none">Save Chat History</label>
          </div>
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-colors shadow-inner"
              disabled={isLoading}
            />
            {isSpeechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`px-4 py-3 rounded-xl transition-colors border shadow-sm ${
                  isListening ? 'bg-red-100 dark:bg-red-900 border-red-500 dark:border-red-700 text-red-600 dark:text-red-300' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? '🛑' : '🎤'}
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 transition-all shadow-md"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}