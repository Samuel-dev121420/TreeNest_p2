<?php

namespace App\Http\Controllers;

use App\Models\Pinote;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PinoteController extends Controller
{
    public function index(Request $request): Response
    {
        $notes = $request->user()->pinotes()->orderByDesc('is_pinned')->latest()->get();

        return Inertia::render('Grow/Pinote', [
            'notes' => $notes,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:150',
            'content' => 'nullable|string',
            'color' => 'nullable|string|max:20',
            'is_pinned' => 'boolean',
            'tags' => 'nullable|array',
        ]);

        $request->user()->pinotes()->create($validated);
        return back()->with('success', 'Catatan berhasil disimpan.');
    }

    public function update(Request $request, Pinote $pinote)
    {
        if ($pinote->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:150',
            'content' => 'nullable|string',
            'color' => 'nullable|string|max:20',
            'is_pinned' => 'boolean',
            'tags' => 'nullable|array',
        ]);

        $pinote->update($validated);
        return back()->with('success', 'Catatan berhasil diperbarui.');
    }

    public function destroy(Request $request, Pinote $pinote)
    {
        if ($pinote->user_id !== $request->user()->id) {
            abort(403);
        }

        $pinote->delete();
        return back()->with('success', 'Catatan berhasil dihapus.');
    }
}
