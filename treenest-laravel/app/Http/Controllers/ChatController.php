<?php

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    public function show(Request $request, User $user): Response
    {
        $currentUserId = $request->user()->id;
        $otherUserId = $user->id;

        // Ambil riwayat chat
        $messages = ChatMessage::where(function ($q) use ($currentUserId, $otherUserId) {
            $q->where('sender_id', $currentUserId)->where('receiver_id', $otherUserId);
        })->orWhere(function ($q) use ($currentUserId, $otherUserId) {
            $q->where('sender_id', $otherUserId)->where('receiver_id', $currentUserId);
        })->orderBy('created_at', 'asc')->get();

        // Tandai pesan sudah dibaca
        ChatMessage::where('sender_id', $otherUserId)
            ->where('receiver_id', $currentUserId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return Inertia::render('Chat', [
            'recipient' => $user,
            'messages' => $messages,
        ]);
    }

    public function sendMessage(Request $request, User $user)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        $msg = ChatMessage::create([
            'sender_id' => $request->user()->id,
            'receiver_id' => $user->id,
            'message' => $validated['message'],
        ]);

        return back()->with('success', 'Pesan terkirim.');
    }
}
