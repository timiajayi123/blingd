'use client';

import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { account, databases, ID, Config } from "@/lib/appwriteConfig";
import { Query, Permission, Role } from 'appwrite';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const FavoritesButton = ({ productId }: { productId: string }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteDocId, setFavoriteDocId] = useState<string | null>(null);
  const [animate, setAnimate] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Appwrite logs a 401 in the console if no session exists.
        // This is unavoidable with the current SDK when checking session status.
        const user = await account.get().catch(() => null);
        if (!user) return;
        
        setUserId(user.$id);

        const result = await databases.listDocuments(
          Config.databaseId,
          Config.favoritesCollectionId,
          [
            Query.equal('userId', user.$id),
            Query.equal('productId', productId)
          ]
        );

        if (result.total > 0) {
          setFavoriteDocId(result.documents[0].$id);
        }
      } catch (err: any) {
        // Silently handle other errors
      }
    };

    loadUser();
  }, [productId]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      toast.error('Please sign in to add favorites', {
        action: {
          label: 'Sign In',
          onClick: () => router.push('/signin')
        }
      });
      return;
    }

    setAnimate(true);
    setTimeout(() => setAnimate(false), 500);

    try {
      if (favoriteDocId) {
        // Optimistic update
        const docIdToDelete = favoriteDocId;
        setFavoriteDocId(null);
        toast.success("Removed from favorites");

        await databases.deleteDocument(
          Config.databaseId,
          Config.favoritesCollectionId,
          docIdToDelete
        );
      } else {
        // Optimistic update
        // We can't fully optimistically update docId, but we can show the heart
        // Ideally we wait for creation to get the ID, or we need a temp ID.
        // For now, let's just wait for creation but show loading if needed? 
        // Actually, the animation handles the visual feedback.
        
        const doc = await databases.createDocument(
          Config.databaseId,
          Config.favoritesCollectionId,
          ID.unique(),
          {
            userId,
            productId,
          },
          [
            Permission.read(Role.user(userId)),
            Permission.write(Role.user(userId)),
          ]
        );
        setFavoriteDocId(doc.$id);
        toast.success("Added to favorites");
      }
    } catch (error: any) {
      console.error("Favorites Error:", error);
      toast.error("Failed to update favorites");
      // Revert state if needed (complex for delete, but easy for add)
      // If add failed, favoriteDocId is still null, which is correct.
      // If delete failed, we should restore it.
      if (favoriteDocId === null) { 
        // We tried to delete and failed. We don't have the old ID easily unless we stored it.
        // Since we did setFavoriteDocId(null), we lost it.
        // Let's reload to be safe or store it in a temp var.
        // For now, let's just reload user favorites to sync.
         try {
           const user = await account.get();
           const result = await databases.listDocuments(
              Config.databaseId,
              Config.favoritesCollectionId,
              [
                Query.equal('userId', user.$id),
                Query.equal('productId', productId)
              ]
            );
            if (result.total > 0) setFavoriteDocId(result.documents[0].$id);
         } catch (e: any) {}
      }
    }
  };

  return (
    <button
      onClick={toggleFavorite}
      className="absolute top-2 right-2 z-20 p-2 rounded-full hover:bg-black/5 transition-all opacity-0 group-hover:opacity-100 duration-300"
      title={favoriteDocId ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={clsx(
          'w-5 h-5 transition-all duration-300 ease-in-out',
          {
            'text-black fill-black scale-110': favoriteDocId || animate,
            'text-gray-400 hover:text-black': !favoriteDocId && !animate,
          }
        )}
      />
    </button>
  );
};

export default FavoritesButton;
