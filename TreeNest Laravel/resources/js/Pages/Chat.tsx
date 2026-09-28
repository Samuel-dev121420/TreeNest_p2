import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import {
    ArrowLeft,
    Send,
    MessageSquare,
    Smile,
    TreePine,
} from 'lucide-react';
import TopHeaderBanner from '@/Components/TopHeaderBanner';
import BottomNav from '@/Components/BottomNav';

interface Recipient {
    id: number;
    name: string;
    username: string;
    account_id: string;
    level: number;
    is_online: boolean;
}

interface Message {
    id: number;
    sender_id: number;
    receiver_id: number;
    message: string;
    is_read: boolean;
    created_at: string;
}

export default function Chat({
    recipient,
    messages = [],
}: {
    recipient: Recipient;
    messages: Message[];
}) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const form = useForm({
        message: '',
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.data.message.trim()) return;

        form.post(route('chat.send', recipient.id), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('message');
                scrollToBottom();
            },
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-emerald-100/50 dark:from-neutral-950 dark:via-neutral-900 dark:to-emerald-950/20 text-neutral-800 dark:text-neutral-100 font-sans pb-28 pt-16 flex flex-col justify-between">
            <Head title={`Chat dengan ${recipient.name} — TreeNest`} />
            <TopHeaderBanner />

            <main className="max-w-3xl w-full mx-auto px-4 sm:px-6 pt-4 flex-1 flex flex-col">
                {/* Chat Header Box */}
                <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-neutral-900/95 border border-emerald-100 dark:border-neutral-800 shadow-xs mb-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/friend-club"
                            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                        >
                            <ArrowLeft className="size-4 text-neutral-600 dark:text-neutral-300" />
                        </Link>
                        <div className="relative">
                            <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                                {recipient.name.charAt(0)}
                            </div>
                            {recipient.is_online && (
                                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                                {recipient.name}
                            </h2>
                            <span className="text-[11px] text-neutral-400">
                                @{recipient.username} • Lvl {recipient.level}
                            </span>
                        </div>
                    </div>

                    <Link
                        href={`/?visit=${recipient.account_id || recipient.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition"
                    >
                        <TreePine className="size-3.5" />
                        <span className="hidden sm:inline">Pohon</span>
                    </Link>
                </div>

                {/* Messages Container */}
                <div className="flex-1 bg-white/70 dark:bg-neutral-900/70 border border-emerald-100/80 dark:border-neutral-800 rounded-3xl p-4 sm:p-5 overflow-y-auto max-h-[55vh] space-y-3">
                    {messages.length === 0 ? (
                        <div className="text-center py-16 text-neutral-400 text-xs">
                            <MessageSquare className="size-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                            <span>Mulai obrolan dan saling menyemangati pertumbuhan pohon!</span>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.receiver_id === recipient.id;
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-xs ${
                                            isMe
                                                ? 'bg-[#1c6b53] text-white rounded-br-xs'
                                                : 'bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white border border-neutral-200/80 dark:border-neutral-700 rounded-bl-xs'
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap">{msg.message}</p>
                                        <div
                                            className={`text-[9px] mt-1 text-right ${
                                                isMe ? 'text-emerald-100' : 'text-neutral-400'
                                            }`}
                                        >
                                            {new Date(msg.created_at).toLocaleTimeString('id-ID', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Ketik pesan..."
                        value={form.data.message}
                        onChange={(e) => form.setData('message', e.target.value)}
                        className="flex-1 rounded-2xl bg-white/95 dark:bg-neutral-900/95 border border-emerald-200 dark:border-neutral-800 px-4 py-3 text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-600 shadow-xs"
                    />
                    <button
                        type="submit"
                        disabled={form.processing || !form.data.message.trim()}
                        className="p-3 rounded-2xl bg-[#1c6b53] hover:bg-[#165a46] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-sm transition disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                        <Send className="size-4" />
                    </button>
                </form>
            </main>

            <BottomNav />
        </div>
    );
}
