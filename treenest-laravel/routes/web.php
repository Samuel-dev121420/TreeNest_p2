<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\DailyTaskController;
use App\Http\Controllers\FlashcardController;
use App\Http\Controllers\FriendController;
use App\Http\Controllers\PinoteController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\StudySessionController;
use App\Http\Controllers\TreeController;
use App\Http\Controllers\TreeGalleryController;
use Illuminate\Support\Facades\Route;

// Redirect root ke Home jika auth, atau ke login jika belum
Route::middleware(['auth'])->group(function () {
    // 1. Home — Pohon Utama & Dashboard Interaktif
    Route::get('/', [TreeController::class, 'index'])->name('home');
    Route::get('/dashboard', [TreeController::class, 'index'])->name('dashboard');
    Route::post('/trees/water', [TreeController::class, 'water'])->name('trees.water');
    Route::put('/trees/update', [TreeController::class, 'update'])->name('trees.update');

    // 2. Modul Grow: Tugas Harian & Hub
    Route::get('/grow', [DailyTaskController::class, 'index'])->name('grow.index');
    Route::get('/grow/dailytask', [DailyTaskController::class, 'index']);
    Route::get('/grow/daily-task', [DailyTaskController::class, 'index'])->name('tasks.index');
    Route::post('/grow/daily-task', [DailyTaskController::class, 'store'])->name('tasks.store');
    Route::patch('/grow/daily-task/{dailyTask}/toggle', [DailyTaskController::class, 'toggle'])->name('tasks.toggle');
    Route::delete('/grow/daily-task/{dailyTask}', [DailyTaskController::class, 'destroy'])->name('tasks.destroy');

    // 3. Modul Grow: Sesi Belajar / Fokus
    Route::get('/grow/study', [StudySessionController::class, 'index'])->name('study.index');
    Route::post('/grow/study', [StudySessionController::class, 'store'])->name('study.store');

    // 4. Modul Grow: Flashcard
    Route::get('/grow/flashcard', [FlashcardController::class, 'index'])->name('flashcard.index');
    Route::get('/grow/flashcard/{flashcardDeck}', [FlashcardController::class, 'show'])->name('flashcard.show');
    Route::post('/grow/flashcard/deck', [FlashcardController::class, 'storeDeck'])->name('flashcard.deck.store');
    Route::post('/grow/flashcard/{flashcardDeck}/card', [FlashcardController::class, 'storeCard'])->name('flashcard.card.store');

    // 5. Modul Grow: Pinotes (Catatan)
    Route::get('/grow/pinote', [PinoteController::class, 'index'])->name('pinote.index');
    Route::post('/grow/pinote', [PinoteController::class, 'store'])->name('pinote.store');
    Route::put('/grow/pinote/{pinote}', [PinoteController::class, 'update'])->name('pinote.update');
    Route::delete('/grow/pinote/{pinote}', [PinoteController::class, 'destroy'])->name('pinote.destroy');

    // 6. Friend Club
    Route::get('/friend-club', [FriendController::class, 'index'])->name('friends.index');
    Route::post('/friend-club/request', [FriendController::class, 'sendRequest'])->name('friends.request');
    Route::patch('/friend-club/{friendship}/respond', [FriendController::class, 'respond'])->name('friends.respond');

    // 7. Realtime Direct Chat
    Route::get('/chat/{user}', [ChatController::class, 'show'])->name('chat.show');
    Route::post('/chat/{user}/send', [ChatController::class, 'sendMessage'])->name('chat.send');

    // 8. Tree Gallery
    Route::get('/gallery', [TreeGalleryController::class, 'index'])->name('gallery.index');
    Route::get('/treegallery', [TreeGalleryController::class, 'index']);
    Route::get('/treegallery-all', [TreeGalleryController::class, 'index']);
    Route::post('/gallery/post', [TreeGalleryController::class, 'store'])->name('gallery.store');
    Route::post('/gallery/{post}/like', [TreeGalleryController::class, 'like'])->name('gallery.like');

    // 9. Admin Panel
    Route::get('/admin', [AdminController::class, 'index'])->name('admin.index');
    Route::patch('/admin/user/{user}/role', [AdminController::class, 'updateUserRole'])->name('admin.user.role');

    // Profile & Pengaturan Akun
    Route::get('/account', [ProfileController::class, 'edit'])->name('account.index');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Autentikasi (Breeze Login, Register, Forgot Password, Reset)
require __DIR__.'/auth.php';
