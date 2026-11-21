'use client';

import { useEffect, useState } from 'react';
import { account, databases, Config } from '@/lib/appwriteConfig';
import { Query } from 'appwrite';
import ProductItem from '@/app/myReusableComponents/ProductItem';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ShoppingBag, Heart, ArrowRight } from 'lucide-react';
import ProductSkeleton from '@/components/ui/ProductSkeleton';
import { Product } from '@/app/types/Product';

const WishlistPage = () => {
  const [wishlist, setWishlist] = useState<(Product & { favId: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        const user = await account.get();

        const favRes = await databases.listDocuments(
          Config.databaseId,
          Config.favoritesCollectionId,
          [Query.equal('userId', user.$id)]
        );

        const productIds = favRes.documents.map((doc: any) => ({
          productId: doc.productId,
          favId: doc.$id,
        }));

        const productPromises = productIds.map((item: { productId: string; favId: string }) =>
          databases.getDocument(Config.databaseId, Config.productsCollectionId, item.productId).then((product: any) => ({
            ...product,
            favId: item.favId,
          })).catch((err: any) => {
             console.error(`Failed to load product ${item.productId}`, err);
             return null;
          })
        );

        const products = (await Promise.all(productPromises)).filter((p): p is (Product & { favId: string }) => p !== null);
        setWishlist(products);
      } catch (error: any) {
        console.error('Error loading wishlist:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWishlist();
  }, []);

  const removeFromWishlist = async (favId: string) => {
    // Optimistic update
    const previousWishlist = [...wishlist];
    setWishlist((prev) => prev.filter((item) => item.favId !== favId));

    try {
      await databases.deleteDocument(Config.databaseId, Config.favoritesCollectionId, favId);
      toast.success('Removed from wishlist');
    } catch (error: any) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item');
      setWishlist(previousWishlist); // Revert on error
    }
  };

  return (
    <div className="min-h-screen bg-white pt-24 pb-12">
      {/* Header Section */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-12 md:py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-gray-900">Your Wishlist</h1>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              Save your favorite items and track their availability.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-96">
                <ProductSkeleton />
              </div>
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 px-4"
          >
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Looks like you haven't added any items to your wishlist yet. 
              Explore our collection and find something you love.
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-900 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-200"
            >
              <ShoppingBag className="w-5 h-5" />
              Start Shopping
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            <AnimatePresence mode="popLayout">
              {wishlist.map((product) => (
                <motion.div
                  key={product.favId}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3 }}
                  className="relative group"
                >
                  <ProductItem
                    product={product}
                    isWishlistPage
                    onRemove={() => removeFromWishlist(product.favId)}
                    hideFavoriteButton={true}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {wishlist.length > 0 && (
           <div className="mt-16 text-center">
             <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-black font-medium transition-colors border-b border-transparent hover:border-black pb-0.5">
               Continue Shopping <ArrowRight className="w-4 h-4" />
             </Link>
           </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
