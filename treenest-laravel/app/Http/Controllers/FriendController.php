<?php

namespace App\Http\Controllers;

use App\Models\Friendship;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FriendController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        // Teman yang sudah accepted
        $friendships = Friendship::where(function ($q) use ($userId) {
            $q->where('user_id', $userId)->orWhere('friend_id', $userId);
        })->where('status', 'accepted')
          ->with(['user', 'friend'])
          ->get();

        $friends = $friendships->map(function ($f) use ($userId) {
            return $f->user_id === $userId ? $f->friend : $f->user;
        });

        // Permintaan pertemanan masuk
        $incomingRequests = Friendship::where('friend_id', $userId)
            ->where('status', 'pending')
            ->with('user')
            ->get();

        return Inertia::render('FriendClub', [
            'friends' => $friends,
            'incomingRequests' => $incomingRequests,
        ]);
    }

    public function sendRequest(Request $request)
    {
        $validated = $request->validate([
            'friend_id' => 'required|exists:users,id',
        ]);

        $userId = $request->user()->id;
        $friendId = $validated['friend_id'];

        if ($userId === $friendId) {
            return back()->with('error', 'Tidak bisa menambahkan diri sendiri.');
        }

        Friendship::firstOrCreate([
            'user_id' => $userId,
            'friend_id' => $friendId,
        ], [
            'status' => 'pending',
        ]);

        return back()->with('success', 'Permintaan pertemanan terkirim.');
    }

    public function respond(Request $request, Friendship $friendship)
    {
        if ($friendship->friend_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'status' => 'required|in:accepted,rejected',
        ]);

        $friendship->update(['status' => $validated['status']]);
        return back()->with('success', 'Status pertemanan diperbarui.');
    }
}
