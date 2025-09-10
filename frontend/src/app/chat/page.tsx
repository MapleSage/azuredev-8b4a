"use client";

import { useState, useCallback, useEffect } from "react";
import {
  useMsal,
  useAccount,
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
} from "@azure/msal-react";
import { b2cPolicies, loginRequest } from "../../msal/msalConfig";
import { B2CErrorHandler } from "../components/B2CErrorHandler";
import { ChatSidebar } from "../components/ChatSidebar";
import { ChatArea } from "../components/ChatArea";
import { MessageInput } from "../components/MessageInput";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import { Fingerprint } from "lucide-react";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastActivity: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_APP_URL || "http://localhost:8000";

function LoginPage() {
  const { instance } = useMsal();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleB2CLogin = async () => {
    try {
      setIsLoading(true);
      setError("");
      await instance.loginRedirect(loginRequest);
    } catch (error: any) {
      console.error("Login failed:", error);
      setError("Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("Password reset not available yet. Please contact support.");
  };

  const handleGoogleLogin = () => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = encodeURIComponent(window.location.origin + "/chat");
    const scope = encodeURIComponent("openid email profile");
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=google`;
    window.location.href = googleAuthUrl;
  };

  const handleGitHubLogin = () => {
    const githubClientId = process.env.NEXT_PUBLIC_GITHUB_ID;
    const redirectUri = encodeURIComponent(window.location.origin + "/chat");
    const scope = encodeURIComponent("user:email");
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=${scope}&state=github`;
    window.location.href = githubAuthUrl;
  };

  const handleFacebookLogin = () => {
    const facebookClientId = process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID;
    const redirectUri = encodeURIComponent(window.location.origin + "/chat");
    const scope = encodeURIComponent("email");
    const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${facebookClientId}&redirect_uri=${redirectUri}&scope=${scope}&state=facebook`;
    window.location.href = facebookAuthUrl;
  };

  const handleAmazonLogin = () => {
    const amazonClientId = process.env.NEXT_PUBLIC_AMAZON_CLIENT_ID;
    const redirectUri = encodeURIComponent(window.location.origin + "/chat");
    const scope = encodeURIComponent("profile");
    const amazonAuthUrl = `https://www.amazon.com/ap/oa?client_id=${amazonClientId}&scope=${scope}&response_type=code&redirect_uri=${redirectUri}&state=amazon`;
    window.location.href = amazonAuthUrl;
  };

  const handleDemoLogin = () => {
    setEmail("demo@sageinsure.com");
    setPassword("demo123");
  };

  return (
    <>
      <B2CErrorHandler />
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-light text-white">
              Sign in to continue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Enter your password"
              />
            </div>

            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Sign In
            </Button>

            <p className="text-center text-sm text-gray-400">
              <button 
                onClick={handleForgotPassword}
                className="text-blue-400 hover:underline"
              >
                Forgot Password?
              </button>
            </p>

            <div className="flex justify-center">
              <Button variant="ghost" size="icon" className="text-gray-400">
                <Fingerprint className="h-6 w-6" />
              </Button>
            </div>

            <div className="relative">
              <Separator className="bg-gray-700" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 px-2 text-sm text-gray-400">
                Or continue with
              </span>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                onClick={handleB2CLogin}
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign Up / Sign In"}
              </Button>
              <Button
                variant="outline"
                className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                onClick={handleGoogleLogin}
              >
                Continue with Google
              </Button>
              <Button
                variant="outline"
                className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                onClick={handleGitHubLogin}
              >
                Continue with GitHub
              </Button>
              <Button
                variant="outline"
                className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                onClick={handleFacebookLogin}
              >
                Continue with Facebook
              </Button>
              <Button
                variant="outline"
                className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                onClick={handleAmazonLogin}
              >
                Continue with Amazon
              </Button>
            </div>

            <div className="bg-gray-800 p-3 rounded-md">
              <p className="text-sm text-gray-300 mb-2">Demo Login:</p>
              <p className="text-xs text-gray-400">Email: demo@sageinsure.com</p>
              <p className="text-xs text-gray-400 mb-2">Password: demo123</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDemoLogin}
                className="text-blue-400 hover:text-blue-300"
              >
                Use Demo Credentials
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              By signing in, you agree to our{" "}
              <a href="#" className="text-blue-400 hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-blue-400 hover:underline">
                Privacy Policy
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}

export default function ChatPage() {
  const { instance, accounts } = useMsal();
  const firstAccount = accounts[0] ?? null;
  const account = useAccount(firstAccount);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle redirect response
  useEffect(() => {
    instance.handleRedirectPromise().catch((error) => {
      console.error("Redirect handling error:", error);
    });
  }, [instance]);

  // ✅ initialize a first conversation
  useEffect(() => {
    const initialConv: Conversation = {
      id: "initial-conversation",
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
    const newId = `conversation-${Date.now()}`;
    const newConversation: Conversation = {
      id: newId,
      title: "New Conversation",
      messages: [],
      lastActivity: "Just now",
    };
    setConversations((prev) => [newConversation, ...prev]);
    setSelectedConversation(newId);
  }, []);

  const handleSendMessage = useCallback(
    async (message: string, files?: File[]) => {
      if (!selectedConversation || !account) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        type: "user",
        content: message,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      // ✅ update state safely without stale closures
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation
            ? {
                ...conv,
                messages: [...conv.messages, userMessage],
                lastActivity: "Just now",
              }
            : conv
        )
      );

      setIsLoading(true);

      try {
        const tokenResponse = await instance.acquireTokenSilent({
          scopes: ["User.Read"],
          account,
        });
        const accessToken = tokenResponse.accessToken;

        // ✅ derive conversation inside callback to avoid stale state
        const currentConversation = conversations.find(
          (c) => c.id === selectedConversation
        );
        const conversation_history = (currentConversation?.messages || []).map(
          (m) => ({
            role: m.type === "user" ? "user" : "assistant",
            content: m.content,
          })
        );

        const res = await fetch(`${API_BASE_URL}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ message, conversation_history }),
        });

        if (!res.ok) {
          throw new Error(`API ${res.status}: ${await res.text()}`);
        }

        const assistantData = await res.json();

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          type: "assistant",
          content: assistantData.answer || "No response received.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversation
              ? {
                  ...conv,
                  messages: [...conv.messages, assistantMessage],
                  lastActivity: "Just now",
                }
              : conv
          )
        );
      } catch (err: any) {
        console.error("Error sending message:", err);
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          type: "assistant",
          content:
            `There was an error calling the API. ${err?.message || ""}`.trim(),
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedConversation
              ? {
                  ...conv,
                  messages: [...conv.messages, errorMessage],
                  lastActivity: "Just now",
                }
              : conv
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [selectedConversation, account, instance, conversations]
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
              conversation={
                conversations.find((c) => c.id === selectedConversation) || null
              }
              isLoading={isLoading}
            />
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={isLoading}
            />
          </div>
        </div>
      </AuthenticatedTemplate>

      <UnauthenticatedTemplate>
        <LoginPage />
      </UnauthenticatedTemplate>
    </>
  );
}
