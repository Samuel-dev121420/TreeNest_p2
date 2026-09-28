<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Trees Table
        Schema::create('trees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name')->default('Pohon Utama');
            $table->string('tree_type')->default('pine'); // pine, oak, sakura, bonsai, etc.
            $table->integer('stage')->default(1); // 1: Seedling, 2: Sapling, 3: Young Tree, 4: Mature Tree, 5: Ancient Tree
            $table->integer('health')->default(100);
            $table->integer('water_level')->default(100);
            $table->integer('exp')->default(0);
            $table->timestamp('planted_at')->useCurrent();
            $table->timestamp('last_watered_at')->nullable();
            $table->timestamps();
        });

        // 2. Daily Tasks
        Schema::create('daily_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->boolean('completed')->default(false);
            $table->integer('exp_reward')->default(15);
            $table->date('due_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        // 3. Study / Focus Sessions (Pomodoro)
        Schema::create('study_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('duration_minutes');
            $table->string('category')->default('Fokus');
            $table->text('notes')->nullable();
            $table->integer('exp_gained')->default(25);
            $table->timestamp('completed_at')->useCurrent();
            $table->timestamps();
        });

        // 4. Flashcard Decks & Cards
        Schema::create('flashcard_decks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('category')->default('Umum');
            $table->boolean('is_public')->default(false);
            $table->timestamps();
        });

        Schema::create('flashcards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deck_id')->constrained('flashcard_decks')->cascadeOnDelete();
            $table->text('question');
            $table->text('answer');
            $table->string('difficulty')->default('medium'); // easy, medium, hard
            $table->integer('review_count')->default(0);
            $table->timestamps();
        });

        // 5. Pinotes (Catatan)
        Schema::create('pinotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->longText('content')->nullable();
            $table->string('color')->default('#ffffff');
            $table->boolean('is_pinned')->default(false);
            $table->json('tags')->nullable();
            $table->timestamps();
        });

        // 6. Friendships & Friend Club
        Schema::create('friendships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('friend_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->timestamps();

            $table->unique(['user_id', 'friend_id']);
        });

        // 7. Chat Messages
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('receiver_id')->constrained('users')->cascadeOnDelete();
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->string('attachment_url')->nullable();
            $table->timestamps();
        });

        // 8. Tree Gallery Posts
        Schema::create('tree_gallery_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tree_id')->nullable()->constrained('trees')->nullOnDelete();
            $table->text('caption')->nullable();
            $table->string('image_url')->nullable();
            $table->integer('likes_count')->default(0);
            $table->integer('comments_count')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tree_gallery_posts');
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('friendships');
        Schema::dropIfExists('pinotes');
        Schema::dropIfExists('flashcards');
        Schema::dropIfExists('flashcard_decks');
        Schema::dropIfExists('study_sessions');
        Schema::dropIfExists('daily_tasks');
        Schema::dropIfExists('trees');
    }
};
