'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Mail, ArrowRight, UserPlus, Check, X } from 'lucide-react'
import Header from '@/components/Header'

export default function SignupPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [acceptTerms, setAcceptTerms] = useState(false)
    const [error, setError] = useState('')
    const [fieldErrors, setFieldErrors] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    })

    // Password strength validation
    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return { strength: 0, label: '', color: '' }

        let strength = 0
        if (pwd.length >= 8) strength++
        if (pwd.length >= 12) strength++
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++
        if (/\d/.test(pwd)) strength++
        if (/[^a-zA-Z0-9]/.test(pwd)) strength++

        if (strength <= 2) return { strength, label: 'Weak', color: 'text-red-400' }
        if (strength <= 3) return { strength, label: 'Fair', color: 'text-yellow-400' }
        if (strength <= 4) return { strength, label: 'Good', color: 'text-blue-400' }
        return { strength, label: 'Strong', color: 'text-green-400' }
    }

    const passwordStrength = getPasswordStrength(password)

    const validateForm = () => {
        const errors = { email: '', password: '', confirmPassword: '' }
        let isValid = true

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email) {
            errors.email = 'Email is required'
            isValid = false
        } else if (!emailRegex.test(email)) {
            errors.email = 'Please enter a valid email'
            isValid = false
        }

        // Password validation
        if (!password) {
            errors.password = 'Password is required'
            isValid = false
        } else if (password.length < 8) {
            errors.password = 'Password must be at least 8 characters'
            isValid = false
        }

        // Confirm password validation
        if (!confirmPassword) {
            errors.confirmPassword = 'Please confirm your password'
            isValid = false
        } else if (password !== confirmPassword) {
            errors.confirmPassword = 'Passwords do not match'
            isValid = false
        }

        setFieldErrors(errors)
        return isValid
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!validateForm()) {
            return
        }

        if (!acceptTerms) {
            setError('Please accept the terms and conditions')
            return
        }

        setIsLoading(true)

        // Mock signup for now (will be connected to backend later)
        setTimeout(() => {
            // Successful signup simulation
            localStorage.setItem('jwt_token', 'mock_token_' + Date.now())
            router.push('/')
        }, 1500)
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header backendStatus="online" />

            <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-black to-pink-900/10"></div>
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>

                <div className="w-full max-w-md relative z-10">
                    <div className="glass-effect p-8 rounded-2xl border border-white/10 shadow-2xl">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <UserPlus className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
                            <p className="text-gray-400">Join us to access your personalized dashboard</p>
                        </div>

                        <form onSubmit={handleSignup} className="space-y-5">
                            {error && (
                                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            {/* Email Field */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value)
                                            setFieldErrors({ ...fieldErrors, email: '' })
                                        }}
                                        className={`w-full bg-black/50 border ${fieldErrors.email ? 'border-red-500/50' : 'border-white/10'
                                            } rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all`}
                                        placeholder="name@company.com"
                                    />
                                </div>
                                {fieldErrors.email && (
                                    <p className="text-xs text-red-400 ml-1 flex items-center gap-1">
                                        <X className="w-3 h-3" />
                                        {fieldErrors.email}
                                    </p>
                                )}
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value)
                                            setFieldErrors({ ...fieldErrors, password: '' })
                                        }}
                                        className={`w-full bg-black/50 border ${fieldErrors.password ? 'border-red-500/50' : 'border-white/10'
                                            } rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all`}
                                        placeholder="••••••••"
                                    />
                                </div>
                                {fieldErrors.password && (
                                    <p className="text-xs text-red-400 ml-1 flex items-center gap-1">
                                        <X className="w-3 h-3" />
                                        {fieldErrors.password}
                                    </p>
                                )}
                                {password && !fieldErrors.password && (
                                    <div className="ml-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-gray-400">Password strength:</span>
                                            <span className={`text-xs font-medium ${passwordStrength.color}`}>
                                                {passwordStrength.label}
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${passwordStrength.strength <= 2
                                                        ? 'bg-red-500'
                                                        : passwordStrength.strength <= 3
                                                            ? 'bg-yellow-500'
                                                            : passwordStrength.strength <= 4
                                                                ? 'bg-blue-500'
                                                                : 'bg-green-500'
                                                    }`}
                                                style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password Field */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 ml-1">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value)
                                            setFieldErrors({ ...fieldErrors, confirmPassword: '' })
                                        }}
                                        className={`w-full bg-black/50 border ${fieldErrors.confirmPassword ? 'border-red-500/50' : 'border-white/10'
                                            } rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all`}
                                        placeholder="••••••••"
                                    />
                                    {confirmPassword && password === confirmPassword && (
                                        <Check className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-400 w-5 h-5" />
                                    )}
                                </div>
                                {fieldErrors.confirmPassword && (
                                    <p className="text-xs text-red-400 ml-1 flex items-center gap-1">
                                        <X className="w-3 h-3" />
                                        {fieldErrors.confirmPassword}
                                    </p>
                                )}
                            </div>

                            {/* Terms & Conditions */}
                            <div className="flex items-start space-x-3">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={acceptTerms}
                                    onChange={(e) => setAcceptTerms(e.target.checked)}
                                    className="mt-1 w-4 h-4 bg-black/50 border border-white/10 rounded focus:ring-2 focus:ring-purple-500 text-purple-500"
                                />
                                <label htmlFor="terms" className="text-sm text-gray-400">
                                    I agree to the{' '}
                                    <Link href="#" className="text-purple-400 hover:text-purple-300">
                                        Terms & Conditions
                                    </Link>{' '}
                                    and{' '}
                                    <Link href="#" className="text-purple-400 hover:text-purple-300">
                                        Privacy Policy
                                    </Link>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <span>Create Account</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-white/10">
                            <p className="text-center text-sm text-gray-400">
                                Already have an account?{' '}
                                <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
