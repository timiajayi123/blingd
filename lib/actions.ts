import { databases } from './appwriteConfig';
import { Query } from 'appwrite';

export const getProductsByCategory = async (category: string) => {
  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID!,
      [Query.equal('category', category)]
    );
    return res.documents;
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }
};

export const getProductById = async (id: string) => {
  try {
    const res = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID!,
      id
    );
    return res;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return null;
  }
};
