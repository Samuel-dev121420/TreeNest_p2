<?php

namespace App\Http\Controllers;

use App\Models\TreeGalleryPost;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TreeGalleryController extends Controller
{
    public function index(Request $request): Response
    {
        $posts = TreeGalleryPost::with(['user', 'tree'])
            ->latest()
            ->paginate(12);

        return Inertia::render('TreeGallery', [
            'posts' => $posts,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'caption' => 'nullable|string|max:500',
            'image_url' => 'nullable|string',
            'tree_id' => 'nullable|exists:trees,id',
        ]);

        $request->user()->treeGalleryPosts()->create($validated);
        return back()->with('success', 'Pohon berhasil dibagikan ke galeri!');
    }

    public function like(Request $request, TreeGalleryPost $post)
    {
        $post->increment('likes_count');
        return back()->with('success', 'Menyukai postingan.');
    }
}
