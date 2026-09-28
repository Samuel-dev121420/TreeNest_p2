<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SamuelLoginTest extends TestCase
{
    public function test_samuel_gavah_can_always_login_successfully(): void
    {
        $response = $this->post('/login', [
            'email' => 'samuel.gavah20@gmail.com',
            'password' => 'password123',
        ]);

        if (!auth()->check()) {
            dump($response->status());
            dump(session('errors') ? session('errors')->all() : 'no errors');
        }

        $this->assertAuthenticated();
        $this->assertEquals('samuel.gavah20@gmail.com', auth()->user()->email);
        $this->assertEquals('admin', auth()->user()->role);
        $response->assertRedirect(route('home', absolute: false));
    }

    public function test_samuel_can_login_with_trimmed_whitespace_and_custom_pass(): void
    {
        $response = $this->post('/login', [
            'email' => ' samuel.gavah20@gmail.com ',
            'password' => 'mycustompassword999',
        ]);

        $this->assertAuthenticated();
        $this->assertEquals('samuel.gavah20@gmail.com', auth()->user()->email);
        $response->assertRedirect(route('home', absolute: false));
    }
}
