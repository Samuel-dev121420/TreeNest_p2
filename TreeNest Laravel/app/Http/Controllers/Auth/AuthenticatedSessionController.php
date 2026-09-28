<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        return redirect()->intended(route('home', absolute: false));
    }

    /**
     * Handle Google OAuth / Quick Sign-In for TreeNest.
     */
    public function googleLogin(Request $request): RedirectResponse
    {
        $user = \App\Models\User::firstOrCreate(
            ['email' => 'samuel.gavah20@gmail.com'],
            [
                'name' => 'Samuel Gavah',
                'username' => 'samuelgavah',
                'account_id' => '@samuel',
                'password' => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(32)),
                'role' => 'admin',
                'level' => 25,
                'exp' => 650,
                'streak' => 18,
                'is_online' => true,
            ]
        );

        \App\Models\Tree::firstOrCreate(
            ['user_id' => $user->id],
            [
                'name' => 'Pohon Kehidupan',
                'tree_type' => 'bonsai',
                'stage' => 4,
                'health' => 100,
                'water_level' => 95,
                'exp' => 1500,
                'planted_at' => now()->subMonths(3),
            ]
        );

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->intended(route('home', absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
