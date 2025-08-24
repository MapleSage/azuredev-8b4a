"use client";

import { useState, useCallback, useEffect } from "react";
import {
  useMsal,
  useAccount,
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
} from "@azure/msal-react";
import { ChatSidebar } from "../components/ChatSidebar";
import { ChatArea } from "../components/ChatArea";
import { MessageInput } from "../components/MessageInput";

interface Message {
  id: string; // switched from number to string
  type: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string; // switched from number to string
  title: string;
  messages: Message[];
  lastActivity: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_APP_URL;

export default function ChatPage() {
  const { instance, accounts } = useMsal();
  const account = accounts[0] ? useAccount(accounts[0]) : null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initialConv: Conversation = {
      id: Date.now().toString(),
      title: "Welcome",
      messages: [],
      lastActivity: "Just now",
    };
    setConversations([initialConv]);
    setSelectedConversation(initialConv.id);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversation(id);
  }, []);

  const handleNewChat = useCallback(() => {
    const newId = Date.now().toString();
    const newConversation: Conversation = {
      id: newId,
      title: "New Conversation",
      messages: [],
      lastActivity: "Just now",
    };
    setConversations(prev => [newConversation, ...prev]);
    setSelectedConversation(newId);
  }, []);

  const handleSendMessage = useCallback(
    async (message: string, files?: File[]) => {
      if (!selectedConversation || !account) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        content: message,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation
            ? { ...conv, messages: [...conv.messages, userMessage], lastActivity: "Just now" }
            : conv
        )
      );

      setIsLoading(true);

      try {
        const tokenResponse = await instance.acquireTokenSilent({
          scopes: ["https://graph.microsoft.com/.default"],
          account,
        });
        const accessToken = tokenResponse.accessToken;

        let uploadedFiles: string[] = [];
        if (files?.length) {
          uploadedFiles = await Promise.all(
            files.map(async file => {
              try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch(`${API_BASE_URL}/upload`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${accessToken}` },
                  body: formData,
                });
                const data = await res.json();
                return data.fileUrl;
              } catch (err) {
                console.error("File upload failed:", file.name, err);
                return null;
              }
            })
          ).then(urls => urls.filter(Boolean) as string[]);
        }

        const res = await fetch(`${API_BASE_URL}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ message, files: uploadedFiles }),
        });

        const assistantData = await res.json();

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: assistantData.response,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setConversations(prev =>
          prev.map(conv =>
            conv.id === selectedConversation
              ? { ...conv, messages: [...conv.messages, assistantMessage], lastActivity: "Just now" }
              : conv
          )
        );
      } catch (err) {
        console.error("Error sending message:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedConversation, account, instance]
  );

  return (
    <>
      <AuthenticatedTemplate>
        <div className="h-screen flex bg-background">
          <div className="w-80 flex-shrink-0">
            <ChatSidebar
              conversations={conversations}
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
            />
          </div>

          <div className="flex-1 flex flex-col">
            <ChatArea
              conversation={conversations.find(c => c.id === selectedConversation) || null}
              isLoading={isLoading}
            />
            <MessageInput onSendMessage={handleSendMessage} disabled={isLoading} />
          </div>
        </div>
      </AuthenticatedTemplate>

      <UnauthenticatedTemplate>
        <div className="flex items-center justify-center h-screen">
          <button
            onClick={() => instance.loginRedirect()}
            className="btn-primary px-6 py-3 rounded-md"
          >
            Sign in with SageInsure
          </button>
        </div>
      </UnauthenticatedTemplate>
    </>
  );
}