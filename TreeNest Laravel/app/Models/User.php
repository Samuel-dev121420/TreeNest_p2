<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'account_id',
        'email',
        'password',
        'role',
        'avatar_url',
        'bio',
        'level',
        'exp',
        'streak',
        'total_logins',
        'theme_preference',
        'is_online',
        'last_seen',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_seen' => 'datetime',
            'password' => 'hashed',
            'is_online' => 'boolean',
            'level' => 'integer',
            'exp' => 'integer',
            'streak' => 'integer',
            'total_logins' => 'integer',
        ];
    }

    /**
     * Relasi ke pohon pengguna
     */
    public function tree(): HasOne
    {
        return $this->hasOne(Tree::class);
    }

    public function trees(): HasMany
    {
        return $this->hasMany(Tree::class);
    }

    /**
     * Relasi ke tugas harian
     */
    public function dailyTasks(): HasMany
    {
        return $this->hasMany(DailyTask::class);
    }

    /**
     * Relasi ke sesi belajar
     */
    public function studySessions(): HasMany
    {
        return $this->hasMany(StudySession::class);
    }

    /**
     * Relasi ke catatan Pinotes
     */
    public function pinotes(): HasMany
    {
        return $this->hasMany(Pinote::class);
    }

    /**
     * Relasi ke flashcard deck
     */
    public function flashcardDecks(): HasMany
    {
        return $this->hasMany(FlashcardDeck::class);
    }

    /**
     * Tambah EXP dan hitung kenaikan level
     */
    public function awardExp(int $amount): void
    {
        $this->exp += $amount;
        $requiredExp = $this->level * 100;
        
        while ($this->exp >= $requiredExp) {
            $this->exp -= $requiredExp;
            $this->level += 1;
            $requiredExp = $this->level * 100;
        }

        $this->save();
    }
}
