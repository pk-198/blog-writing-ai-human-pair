/**
 * Home page - Landing/Welcome page for Blog Creation System
 */

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Blog Creation System
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-Human Collaborative Blog Creation for Dograh
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-3xl mb-4">✍️</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Creator Mode
            </h2>
            <p className="text-gray-600 mb-4">
              Create SEO-optimized blog posts through a structured 22-step workflow with AI assistance.
            </p>
            <ul className="text-sm text-gray-500 space-y-2">
              <li>• SERP analysis & competitor research</li>
              <li>• AI-powered drafting & optimization</li>
              <li>• Comprehensive content collection</li>
              <li>• Export-ready markdown output</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-3xl mb-4">🔍</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Reviewer Mode
            </h2>
            <p className="text-gray-600 mb-4">
              Audit and review blog creation sessions with complete transparency.
            </p>
            <ul className="text-sm text-gray-500 space-y-2">
              <li>• View complete audit trail</li>
              <li>• Track progress across all steps</li>
              <li>• Provide feedback to creators</li>
              <li>• Read-only access for oversight</li>
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              Ready to get started?
            </h3>
            <p className="text-gray-600 mb-6">
              Login to access the creator dashboard or reviewer interface.
            </p>
            <Link
              href="/login"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>

        {/* System Info */}
        <div className="mt-16 text-center">
          <div className="inline-block bg-white rounded-lg shadow px-6 py-3">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Target:</span> 15-20 blogs/month •
              <span className="font-semibold ml-2">Version:</span> 1.0.0 •
              <span className="font-semibold ml-2">Status:</span>
              <span className="text-green-600 ml-1">Running</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
