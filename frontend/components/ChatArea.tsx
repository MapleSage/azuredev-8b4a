import {
  Bot,
  User,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Shield,
  FileText,
  Clock,
} from "lucide-react";
import { Button } from "./SimpleButton";
import { Avatar, AvatarFallback, AvatarImage } from "./SimpleAvatar";
// import { ScrollArea } from "./ui/scroll-area"
import { useEffect, useRef } from "react";

interface Message {
  id: number;
  type: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: number;
  title: string;
  messages: Message[];
  lastActivity: string;
}

interface ChatAreaProps {
  conversation: Conversation | null;
  isLoading?: boolean;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ChatArea({
  conversation,
  isLoading,
  title = "SageSure AI",
  emptyTitle = "Welcome to SageSure",
  emptyDescription = "Ask about a claim, policy, document, or workflow. I’ll keep the current session context as you work.",
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, isLoading]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-[#EAF7F8] rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-[#007A8A]" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-[#24384A]">{emptyTitle}</h2>
          <p className="text-gray-600 mb-4">{emptyDescription}</p>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <FileText className="w-4 h-4" />
              <span>File auto, marine, cyber & commercial claims</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>24/7 claims processing support</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Shield className="w-4 h-4" />
              <span>Secure & confidential</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {conversation.messages.map((message) => (
            <div key={message.id} className="flex gap-4">
              <Avatar className="w-8 h-8 flex-shrink-0">
                {message.type === "user" ? (
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                ) : (
                  <AvatarImage src="/brand/sagesure-mark.png" alt="SageSure" />
                )}
                {message.type === "assistant" && (
                  <AvatarFallback className="bg-[#007A8A] text-white">
                    <Shield className="w-4 h-4" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {message.type === "user" ? "You" : title}
                  </span>
                  <span className="text-xs text-gray-600">
                    {message.timestamp}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content.split("\n").map((line, index) => (
                      <div key={index} className={index > 0 ? "mt-1" : ""}>
                        {line.startsWith("• ") ? (
                          <div className="flex items-start">
                            <span className="text-[#007A8A] mr-2">•</span>
                            <span>{line.substring(2)}</span>
                          </div>
                        ) : line.includes(":") &&
                          !line.includes("http") &&
                          line.split(":").length === 2 ? (
                          <div>
                            <span className="font-semibold text-gray-800">
                              {line.split(":")[0]}:
                            </span>
                            <span className="ml-1">{line.split(":")[1]}</span>
                          </div>
                        ) : (
                          <span>{line}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {message.type === "assistant" && (
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(message.content);
                          // Show success feedback
                          const button =
                            document.activeElement as HTMLButtonElement;
                          const originalText = button.textContent;
                          button.textContent = "Copied!";
                          setTimeout(() => {
                            button.textContent = originalText;
                          }, 2000);
                        } catch (err) {
                          console.error("Failed to copy text: ", err);
                          // Fallback: select text for manual copy
                          const textArea = document.createElement("textarea");
                          textArea.value = message.content;
                          document.body.appendChild(textArea);
                          textArea.select();
                          document.execCommand("copy");
                          document.body.removeChild(textArea);
                          alert("Text copied to clipboard");
                        }
                      }}>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        // Store feedback in localStorage
                        const feedback = JSON.parse(
                          localStorage.getItem("messageFeedback") || "{}"
                        );
                        feedback[message.id] = "positive";
                        localStorage.setItem(
                          "messageFeedback",
                          JSON.stringify(feedback)
                        );

                        // Visual feedback
                        const button =
                          document.activeElement as HTMLButtonElement;
                        button.style.color = "#10b981";
                        setTimeout(() => {
                          button.style.color = "";
                        }, 2000);

                        console.log(
                          "Positive feedback recorded for message:",
                          message.id
                        );
                      }}>
                      <ThumbsUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        // Store feedback in localStorage
                        const feedback = JSON.parse(
                          localStorage.getItem("messageFeedback") || "{}"
                        );
                        feedback[message.id] = "negative";
                        localStorage.setItem(
                          "messageFeedback",
                          JSON.stringify(feedback)
                        );

                        // Visual feedback
                        const button =
                          document.activeElement as HTMLButtonElement;
                        button.style.color = "#ef4444";
                        setTimeout(() => {
                          button.style.color = "";
                        }, 2000);

                        console.log(
                          "Negative feedback recorded for message:",
                          message.id
                        );
                      }}>
                      <ThumbsDown className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-4">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-[#007A8A] text-white">
                  <Shield className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{title}</span>
                  <span className="text-xs text-gray-600">typing...</span>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}></div>
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}></div>
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
