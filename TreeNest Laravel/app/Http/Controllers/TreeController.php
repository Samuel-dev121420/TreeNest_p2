<?php

namespace App\Http\Controllers;

use App\Models\Tree;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TreeController extends Controller
{
    /**
     * Tampilan utama TreeNest (Pohon pengguna & status pertumbuhan)
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Cari atau buat pohon pertama jika belum ada
        $tree = Tree::firstOrCreate(
            ['user_id' => $user->id],
            [
                'name' => 'Pohon ' . $user->name,
                'tree_type' => 'pine',
                'stage' => 1,
                'health' => 100,
                'water_level' => 100,
                'exp' => 0,
                'planted_at' => now(),
            ]
        );

        // Ambil daily tasks aktif
        $tasks = $user->dailyTasks()->latest()->take(5)->get();

        return Inertia::render('Home', [
            'tree' => $tree,
            'tasks' => $tasks,
            'user' => [
                'id'         => $user->id,
                'name'       => $user->name,
                'username'   => $user->username,
                'level'      => $user->level,
                'exp'        => $user->exp,
                'streak'     => $user->streak,
                'role'       => $user->role,
                'avatar_url' => $user->avatar_url,
                'hue'        => $user->hue ?? 150,
                'initials'   => $user->initials ?? strtoupper(substr($user->username ?? $user->name, 0, 2)),
                'account_id' => $user->account_id ?? ('TN-' . str_pad($user->id, 4, '0', STR_PAD_LEFT)),
            ],
            'friends' => [], // TODO: fetch featured friends from Firebase
        ]);
    }

    /**
     * Menyiram pohon (menaikkan air, exp pohon, dan exp user)
     */
    public function water(Request $request)
    {
        $user = $request->user();
        $tree = Tree::where('user_id', $user->id)->firstOrFail();

        $tree->water();
        $user->awardExp(10);

        return back()->with('success', 'Pohon berhasil disiram! +10 EXP');
    }

    /**
     * Ganti nama atau tipe pohon
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:50',
            'tree_type' => 'nullable|string|in:pine,oak,sakura,bonsai',
        ]);

        $user = $request->user();
        $tree = Tree::where('user_id', $user->id)->firstOrFail();
        $tree->update(array_filter($validated));

        return back()->with('success', 'Data pohon berhasil diperbarui.');
    }
}
