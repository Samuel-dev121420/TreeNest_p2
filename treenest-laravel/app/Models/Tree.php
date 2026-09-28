<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Tree extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'tree_type',
        'stage',
        'health',
        'water_level',
        'exp',
        'planted_at',
        'last_watered_at',
    ];

    protected function casts(): array
    {
        return [
            'stage' => 'integer',
            'health' => 'integer',
            'water_level' => 'integer',
            'exp' => 'integer',
            'planted_at' => 'datetime',
            'last_watered_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Siram pohon: menambah level air, exp pohon, dan health
     */
    public function water(): bool
    {
        $this->water_level = min(100, $this->water_level + 25);
        $this->health = min(100, $this->health + 10);
        $this->exp += 15;
        $this->last_watered_at = now();

        // Kenaikan stage jika EXP cukup
        $thresholds = [1 => 100, 2 => 300, 3 => 700, 4 => 1500];
        if (isset($thresholds[$this->stage]) && $this->exp >= $thresholds[$this->stage]) {
            $this->stage = min(5, $this->stage + 1);
        }

        return $this->save();
    }
}
