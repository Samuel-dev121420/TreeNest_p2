<?php

namespace App\Http\Controllers;

use App\Models\DailyTask;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DailyTaskController extends Controller
{
    public function index(Request $request): Response
    {
        $tasks = $request->user()->dailyTasks()->latest()->get();

        return Inertia::render('Grow/DailyTask', [
            'tasks' => $tasks,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'exp_reward' => 'nullable|integer|min:5|max:100',
            'due_date' => 'nullable|date',
        ]);

        $task = $request->user()->dailyTasks()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'exp_reward' => $validated['exp_reward'] ?? 15,
            'due_date' => $validated['due_date'] ?? null,
        ]);

        return back()->with('success', 'Tugas harian berhasil ditambahkan.');
    }

    public function toggle(Request $request, DailyTask $dailyTask)
    {
        // Pastikan hanya pemilik tugas yang bisa mengubah status
        if ($dailyTask->user_id !== $request->user()->id) {
            abort(403);
        }

        $dailyTask->completed = !$dailyTask->completed;
        $dailyTask->completed_at = $dailyTask->completed ? now() : null;
        $dailyTask->save();

        if ($dailyTask->completed) {
            $request->user()->awardExp($dailyTask->exp_reward);
        }

        return back()->with('success', $dailyTask->completed ? 'Tugas selesai! +' . $dailyTask->exp_reward . ' EXP' : 'Status tugas diperbarui.');
    }

    public function destroy(Request $request, DailyTask $dailyTask)
    {
        if ($dailyTask->user_id !== $request->user()->id) {
            abort(403);
        }

        $dailyTask->delete();
        return back()->with('success', 'Tugas berhasil dihapus.');
    }
}
