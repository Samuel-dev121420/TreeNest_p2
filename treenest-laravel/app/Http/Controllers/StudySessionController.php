<?php

namespace App\Http\Controllers;

use App\Models\StudySession;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudySessionController extends Controller
{
    public function index(Request $request): Response
    {
        $sessions = $request->user()->studySessions()->latest()->take(20)->get();
        $totalMinutes = $request->user()->studySessions()->sum('duration_minutes');

        return Inertia::render('Grow/Study', [
            'sessions' => $sessions,
            'totalMinutes' => $totalMinutes,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'duration_minutes' => 'required|integer|min:1|max:360',
            'category' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:500',
        ]);

        $expReward = max(10, intval($validated['duration_minutes'] * 1.5));

        $session = $request->user()->studySessions()->create([
            'duration_minutes' => $validated['duration_minutes'],
            'category' => $validated['category'] ?? 'Fokus',
            'notes' => $validated['notes'] ?? null,
            'exp_gained' => $expReward,
            'completed_at' => now(),
        ]);

        $request->user()->awardExp($expReward);

        return back()->with('success', 'Sesi belajar selesai! +' . $expReward . ' EXP');
    }
}
