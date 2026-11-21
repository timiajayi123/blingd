"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to account after successful auth
    router.replace("/account");
  }, [router]);

  return (
    <div className="flex justify-center items-center h-screen text-gray-600">
      Redirecting...
    </div>
  );
}
