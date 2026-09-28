<?php

namespace App\Http\Controllers;

use App\Models\DailyTask;
use App\Models\Tree;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    public function index(Request $request): Response
    {
        // Pastikan hanya role admin yang boleh mengakses
        if ($request->user()->role !== 'admin') {
            abort(403, 'Akses khusus administrator.');
        }

        $stats = [
            'total_users' => User::count(),
            'total_trees' => Tree::count(),
            'total_tasks' => DailyTask::count(),
            'completed_tasks' => DailyTask::where('completed', true)->count(),
        ];

        $users = User::latest()->take(20)->get();

        return Inertia::render('Admin', [
            'stats' => $stats,
            'users' => $users,
        ]);
    }

    public function updateUserRole(Request $request, User $user)
    {
        if ($request->user()->role !== 'admin') {
            abort(403);
        }

        $validated = $request->validate([
            'role' => 'required|in:user,admin',
        ]);

        $user->update(['role' => $validated['role']]);
        return back()->with('success', 'Role user berhasil diubah.');
    }
}
