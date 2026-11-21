'use client';

import { account } from '@/lib/appwriteConfig';
import { OAuthProvider } from 'appwrite';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { getPublicMediaUrl } from '@/lib/publicMedia';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await account.createEmailPasswordSession(email, password);
      toast.success('Signed in successfully!');
      router.push('/');
    } catch (error: any) {
      console.error('Sign-in error:', error);
      toast.error(error.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      await account.createOAuth2Session(
        OAuthProvider.Google,
        window.location.origin + "/auth-callback",
        window.location.origin + "/signin"
      );
    } catch (error) {
      toast.error('Google sign-in failed.');
    }
  };

  return (
    <div className="min-h-screen flex lg:flex-row flex-col bg-white relative">
      
      {/* MOBILE BACKGROUND (Absolute) */}
      <div className="absolute inset-0 lg:hidden z-0">
         <Image 
           src={getPublicMediaUrl("/placeholder.svg")}
           alt="Background" 
           fill 
           className="object-cover"
           priority
         />
         <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      </div>

      {/* LEFT SIDE - Content */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-24 relative z-10 min-h-screen lg:min-h-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm space-y-8 text-center bg-white/95 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none p-8 rounded-3xl shadow-2xl lg:shadow-none lg:p-0"
        >
          {/* Logo / Brand */}
          <Link href="/" className="inline-block text-3xl font-black tracking-tighter text-black hover:opacity-80 transition-opacity">
            BLING’D
          </Link>

          {/* Greeting */}
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              Welcome Back
            </h2>
            <p className="text-gray-600 lg:text-gray-500 text-lg">
              Sign in to manage your assets.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">IDENTIFIER_EMAIL</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white rounded-2xl py-4 pl-12 pr-4 outline-none transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">ACCESS_KEY</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white rounded-2xl py-4 pl-12 pr-4 outline-none transition-all duration-200"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "INITIALIZE_SESSION"}
            </button>
          </form>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-xs font-black uppercase tracking-widest text-gray-400">OR</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Google Button */}
          <div className="space-y-6 pt-2">
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-4 bg-white border-2 border-gray-100 text-black px-8 py-4 rounded-2xl font-semibold text-lg shadow-sm hover:border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group active:scale-[0.98]"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google logo"
                className="w-6 h-6"
              />
              <span className="font-black uppercase tracking-widest text-sm">Continue with Google</span>
            </button>

            <p className="text-sm text-gray-500">
              New here?{' '}
              <Link href="/signup" className="text-black font-black underline hover:text-primary transition-colors">
                CREATE_ACCOUNT
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Footer Links - Adaptive Color */}
        <div className="absolute bottom-8 text-sm lg:text-gray-400 text-white/60 flex gap-6 z-20">
          <Link href="/help" className="hover:text-white lg:hover:text-gray-900 transition-colors">Help Center</Link>
          <Link href="/privacy" className="hover:text-white lg:hover:text-gray-900 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white lg:hover:text-gray-900 transition-colors">Terms</Link>
        </div>
      </div>

      {/* RIGHT SIDE - Banner (Desktop Only) */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-gray-100">
        <motion.div 
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img
            src={getPublicMediaUrl("/placeholder.svg")}
            alt="Sign In Banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-end p-20 text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <h3 className="text-5xl font-bold mb-6 leading-tight">Elevate Your<br/>Everyday Style.</h3>
              <p className="text-lg text-white/90 max-w-md font-light leading-relaxed">
                Join our exclusive community for early access to drops, member-only offers, and curated collections.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
