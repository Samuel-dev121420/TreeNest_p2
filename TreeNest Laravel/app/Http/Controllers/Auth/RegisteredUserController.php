<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'username' => 'required|string|min:3|max:255|unique:'.User::class,
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'string', 'min:6'],
        ]);

        $username = trim($request->username);
        $name = $request->name ?: $username;

        $user = User::create([
            'name' => $name,
            'username' => $username,
            'account_id' => '@' . $username,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'user',
            'level' => 1,
            'exp' => 0,
            'streak' => 1,
        ]);

        \App\Models\Tree::firstOrCreate(
            ['user_id' => $user->id],
            [
                'name' => 'Pohon ' . $user->name,
                'tree_type' => 'pine',
                'stage' => 1,
                'health' => 100,
                'water_level' => 100,
                'exp' => 0,
                'planted_at' => now(),
            ]
        );

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('home', absolute: false));
    }
}
