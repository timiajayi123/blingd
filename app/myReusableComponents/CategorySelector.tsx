import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';

type Category = {
  $id: string;
  name: string;
  order?: number;
  isBranded?: boolean;
};

interface CategorySelectorProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
}

const CategorySelector = memo(({ categories, activeCategory, onSelectCategory }: CategorySelectorProps) => {
  const [showAll, setShowAll] = useState(false);
  
  // "All" + sorted categories passed from parent
  const allCategories = [{ $id: 'all', name: 'All', isBranded: false }, ...categories];
  
  // Show "All" + top 5 categories initially
  const visibleCount = 6; 
  const displayedCategories = showAll ? allCategories : allCategories.slice(0, visibleCount);
  const hasMore = allCategories.length > visibleCount;

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2">
      <div className="flex gap-3 px-4 min-w-max mx-auto justify-start sm:justify-center items-center">
        <AnimatePresence mode='popLayout'>
          {displayedCategories.map((cat) => {
            const isActive = activeCategory.toLowerCase() === (cat.name === 'All' ? 'all' : cat.name.toLowerCase());
            return (
              <motion.button
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                key={cat.$id}
                onClick={() => onSelectCategory(cat.name === 'All' ? 'all' : cat.name)}
                className={`
                  relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300
                  flex items-center gap-2 whitespace-nowrap
                  ${isActive
                    ? 'bg-black text-white shadow-lg scale-105 z-10'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md'}
                `}
              >
                {cat.name}
                {cat.isBranded && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Branded Collection" />
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Show More / Show Less Button */}
        {hasMore && (
          <motion.button
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setShowAll(!showAll)}
            className="
              px-4 py-2.5 rounded-full text-sm font-medium 
              bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 
              flex items-center gap-1 transition-all duration-300 whitespace-nowrap
            "
          >
            {showAll ? (
              <>
                Show Less <ChevronLeft size={16} />
              </>
            ) : (
              <>
                More <ChevronRight size={16} />
              </>
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
});

export default CategorySelector;
