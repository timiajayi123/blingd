export type CartItem = {
  $id: string;
  cartItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  selectedSize?: string | null;
  freeDelivery?: boolean;
  preOrder?: boolean;
  preOrderTier?: string | null;
};
