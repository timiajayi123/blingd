export interface Product {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  name: string;
  price: number;
  longDescription: string;
  shortDescription: string;
  images: string[];
  stock: number;
  category: string;
  colors: string[];
  sizes?: string[];
  freeDelivery?: boolean;
  customizable?: boolean;
  comingSoon?: boolean;
  releaseAt?: string;
  countdownEnabled?: boolean;
  released?: boolean;
  preOrder?: boolean;
  preOrderTier?: string | number;
  dropId?: string;
}
