<?php

namespace Database\Seeders;

use App\Models\DailyTask;
use App\Models\Tree;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Akun Admin TreeNest (Samuel Gavah)
        $admin = User::updateOrCreate([
            'email' => 'samuel.gavah20@gmail.com',
        ], [
            'name' => 'Samuel Gavah',
            'username' => 'samuelgavah',
            'account_id' => '@samuel',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'level' => 25,
            'exp' => 650,
            'streak' => 18,
            'total_logins' => 30,
            'theme_preference' => 'dark',
            'is_online' => true,
        ]);

        User::firstOrCreate([
            'email' => 'admin@treenest.com',
        ], [
            'name' => 'Admin TreeNest',
            'username' => 'admin',
            'account_id' => '@admin',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'level' => 20,
            'exp' => 500,
            'streak' => 15,
            'total_logins' => 25,
            'theme_preference' => 'dark',
            'is_online' => true,
        ]);

        // Pohon Admin
        Tree::firstOrCreate([
            'user_id' => $admin->id,
        ], [
            'name' => 'Pohon Kebijaksanaan',
            'tree_type' => 'bonsai',
            'stage' => 4,
            'health' => 100,
            'water_level' => 90,
            'exp' => 1200,
            'planted_at' => now()->subMonths(2),
        ]);

        // Tugas Bawaan
        DailyTask::firstOrCreate([
            'user_id' => $admin->id,
            'title' => 'Siram pohon hari ini',
        ], [
            'description' => 'Siram pohonmu agar tetap sehat dan bertumbuh',
            'completed' => true,
            'exp_reward' => 15,
            'completed_at' => now(),
        ]);

        DailyTask::firstOrCreate([
            'user_id' => $admin->id,
            'title' => 'Sesi fokus belajar 25 menit',
        ], [
            'description' => 'Gunakan timer Pomodoro untuk menyelesaikan tugas',
            'completed' => false,
            'exp_reward' => 25,
            'due_date' => now(),
        ]);

        // 2. Akun Demo User
        $user = User::firstOrCreate([
            'email' => 'user@treenest.com',
        ], [
            'name' => 'Penjelajah TreeNest',
            'username' => 'penjelajah',
            'account_id' => '@penjelajah',
            'password' => Hash::make('password123'),
            'role' => 'user',
            'level' => 2,
            'exp' => 45,
            'streak' => 3,
            'total_logins' => 5,
            'theme_preference' => 'system',
            'is_online' => true,
        ]);

        Tree::firstOrCreate([
            'user_id' => $user->id,
        ], [
            'name' => 'Tunas Harapan',
            'tree_type' => 'pine',
            'stage' => 2,
            'health' => 85,
            'water_level' => 70,
            'exp' => 145,
            'planted_at' => now()->subDays(5),
        ]);
    }
}
