<?php

namespace App\Http\Controllers;

use App\Models\Flashcard;
use App\Models\FlashcardDeck;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FlashcardController extends Controller
{
    public function index(Request $request): Response
    {
        $myDecks = $request->user()->flashcardDecks()->withCount('cards')->latest()->get();
        $publicDecks = FlashcardDeck::where('is_public', true)->withCount('cards')->latest()->take(10)->get();

        return Inertia::render('Grow/Flashcard', [
            'myDecks' => $myDecks,
            'publicDecks' => $publicDecks,
        ]);
    }

    public function show(Request $request, FlashcardDeck $flashcardDeck): Response
    {
        $flashcardDeck->load('cards');

        return Inertia::render('Grow/FlashcardStudy', [
            'deck' => $flashcardDeck,
            'cards' => $flashcardDeck->cards,
        ]);
    }

    public function storeDeck(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:50',
            'is_public' => 'boolean',
        ]);

        $deck = $request->user()->flashcardDecks()->create($validated);
        return back()->with('success', 'Deck flashcard berhasil dibuat.');
    }

    public function storeCard(Request $request, FlashcardDeck $flashcardDeck)
    {
        if ($flashcardDeck->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'question' => 'required|string',
            'answer' => 'required|string',
            'difficulty' => 'nullable|string|in:easy,medium,hard',
        ]);

        $flashcardDeck->cards()->create($validated);
        return back()->with('success', 'Kartu flashcard berhasil ditambahkan.');
    }
}
