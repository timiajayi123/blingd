"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatars } from "appwrite";
import { account, client } from "@/lib/appwriteConfig";
import { motion, Variants } from "framer-motion";
import { 
  Package, 
  Heart, 
  LogOut, 
  ChevronRight, 
  ShoppingBag, 
  Clock,
  MapPin
} from "lucide-react";
import Link from "next/link";
import { getCustomerOrders } from '@/lib/customerOrders';

const avatars = new Avatars(client);

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [orderStats, setOrderStats] = useState({ total: 0, lastOrder: null as any });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await account.get();
        setUser(res);

        // Fetch Order Stats
        try {
          const orders = await getCustomerOrders(1);
          
          setOrderStats({
            total: orders.total,
            lastOrder: orders.documents[0] || null
          });
        } catch (error) {
          console.error("Failed to fetch order stats:", error);
        }

      } catch {
        router.push("/signin");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      router.push("/signin");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const copyUserId = () => {
    if (user?.$id) {
      navigator.clipboard.writeText(user.$id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const quickLinks = [
    { 
      title: "My Orders", 
      icon: Package, 
      href: "/orders", 
      desc: "Track active orders & history",
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    { 
      title: "Wishlist", 
      icon: Heart, 
      href: "/wishlist", 
      desc: "Your saved items",
      color: "text-pink-600",
      bg: "bg-pink-50"
    },

    { 
      title: "Addresses", 
      icon: MapPin, 
      href: "/account/addresses", 
      desc: "Manage delivery locations",
      color: "text-orange-600",
      bg: "bg-orange-50"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 pt-10 px-4 sm:px-6">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto space-y-8"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{user.name.split(' ')[0]}</span>
            </h1>
            <p className="text-gray-500 mt-1">Manage your account and view your recent activity.</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-red-500 hover:bg-red-50 hover:border-red-100 transition-all text-sm font-medium shadow-sm"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Card */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <div className="flex flex-col items-center text-center">
                <div className="relative group cursor-pointer">
                  <img
                    src={avatars.getInitials(user.name, 128, 128).toString()}
                    alt="Profile"
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute bottom-0 right-0 bg-green-500 w-5 h-5 rounded-full border-2 border-white"></div>
                </div>
                
                <h2 className="text-xl font-bold mt-4 text-gray-900">{user.name}</h2>
                <p className="text-sm text-gray-500 mb-4">{user.email}</p>

                <div className="w-full pt-4 border-t border-gray-100 flex flex-col gap-2">
                  <div 
                    onClick={copyUserId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">User ID</span>
                      <span className="text-xs font-mono text-gray-600 group-hover:text-black transition-colors truncate w-32">
                        {user.$id}
                      </span>
                    </div>
                    <span className="text-xs bg-white px-2 py-1 rounded-md shadow-sm text-gray-500 group-hover:text-blue-600 transition-colors">
                      {copied ? "Copied!" : "Copy"}
                    </span>
                  </div>

                  {user.email === "officialtimzi@gmail.com" && (
                    <div className="mt-2 inline-flex items-center justify-center gap-1 bg-blue-600 text-white text-xs py-1.5 px-3 rounded-full font-medium">
                      <span>Admin Access</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Stats & Links */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">
            
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                  <ShoppingBag size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{orderStats.total}</p>
                  <p className="text-sm text-gray-500">Total Orders</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Latest Activity</p>
                  <p className="text-xs text-gray-500">
                    {orderStats.lastOrder 
                      ? new Date(orderStats.lastOrder.$createdAt).toLocaleDateString() 
                      : "No activity yet"}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickLinks.map((link) => (
                  <Link href={link.href} key={link.title}>
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group h-full flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-10 h-10 ${link.bg} ${link.color} rounded-full flex items-center justify-center`}>
                          <link.icon size={20} />
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-gray-500 transition-colors" size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{link.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">{link.desc}</p>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Order Preview */}
            {orderStats.lastOrder && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Recent Order</h3>
                  <Link href="/orders" className="text-sm text-blue-600 hover:underline font-medium">View All</Link>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                    <Package className="text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">Order #{orderStats.lastOrder.$id.substring(0, 8).toUpperCase()}</p>
                    <p className="text-sm text-gray-500">{new Date(orderStats.lastOrder.$createdAt).toDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₦{orderStats.lastOrder.total?.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                      orderStats.lastOrder.status === 'completed' ? 'bg-green-100 text-green-700' :
                      orderStats.lastOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {orderStats.lastOrder.status || 'pending'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
