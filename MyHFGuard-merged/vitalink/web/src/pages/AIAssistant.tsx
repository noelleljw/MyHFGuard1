import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { serverUrl } from "@/lib/api";

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function AIAssistant() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hello! I am your AI Health Assistant. I can help with symptoms, vitals, and general advice. Try: "What do my BP readings mean?", "Show warning signs", or "How to log today\'s BP".',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [patientId, setPatientId] = useState<string | null>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [suggestions] = useState<string[]>([
        "How to log today's blood pressure",
        "What does high systolic mean?",
        "Show heart failure warning signs",
        "Explain my weekly vitals chart"
    ])

    useEffect(() => {
        async function getUser() {
            const { data } = await supabase.auth.getSession();
            if (data.session?.user) {
                setPatientId(data.session.user.id);
            }
        }
        getUser();

        (async () => {
          try {
            const res = await fetch(`${serverUrl()}/health`)
            if (!res.ok) throw new Error(String(res.status))
            console.log('[AIAssistant] backend health ok')
          } catch (e) {
            console.error('[AIAssistant] backend health failed', e)
            toast.error('Server connectivity issue')
          }
        })()
    }, []);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch(`${serverUrl()}api/chat/symptoms`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: input, patientId })
            })
            if (!res.ok) throw new Error('AI request failed')
            const data = await res.json()
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.reply || 'I can help with symptoms, vitals, and general guidance.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (err: any) {
            toast.error("Failed to get response from AI");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl h-[calc(100vh-theme(spacing.20))]">
            <Card className="h-full flex flex-col border-primary/20 shadow-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <CardHeader className="border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Vitalink AI Assistant</CardTitle>
                            <CardDescription>Your personal health companion</CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 p-0 overflow-hidden relative">
                    <div className="absolute inset-0 overflow-y-auto p-4 space-y-4" ref={scrollAreaRef}>
                        {messages.map((msg) => (
                            <div key={msg.id}>
                                {msg.content}
                            </div>
                        ))}
                    </div>
                </CardContent>

                <CardFooter className="p-4 border-t bg-background">
                    <form onSubmit={handleSend} className="flex gap-3 w-full">
                        <Input
                            placeholder="Type your health question..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            disabled={loading}
                            className="flex-1"
                        />
                        <Button type="submit" disabled={loading || !input.trim()} size="icon">
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    );
}