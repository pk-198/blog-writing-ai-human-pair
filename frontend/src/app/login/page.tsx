/**
 * Login page for Creator and Reviewer authentication
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { storeAuth, getRedirectPath } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'creator' | 'reviewer'>('creator');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call backend API
      const response = await api.login({ role, password });

      // Store token and role
      storeAuth(response.access_token, response.role);

      // Redirect to appropriate dashboard
      const redirectPath = getRedirectPath(response.role);
      router.push(redirectPath);
    } catch (err) {
      // Show error message
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Blog Creation System
          </h1>
          <p className="text-gray-600">Login to continue</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('creator')}
                className={`py-3 px-4 rounded-lg font-medium transition-all ${
                  role === 'creator'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ✍️ Creator
              </button>
              <button
                type="button"
                onClick={() => setRole('reviewer')}
                className={`py-3 px-4 rounded-lg font-medium transition-all ${
                  role === 'reviewer'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🔍 Reviewer
              </button>
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Role Description */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {role === 'creator' ? (
              <>
                <span className="font-semibold">Creator:</span> Create and manage blog content through the 22-step workflow.
              </>
            ) : (
              <>
                <span className="font-semibold">Reviewer:</span> Audit and review blog sessions with read-only access.
              </>
            )}
          </p>
        </div>

        {/* Back Link */}
        <div className="mt-4 text-center">
          <a href="/" className="text-sm text-indigo-600 hover:text-indigo-700">
            ← Back to home
          </a>
        </div>
      </div>
    </main>
  );
}
