import React, { createContext, useContext, useState } from 'react';

export interface CartItem {
  id: string;
  name: string;
  banglaName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

interface CartContextType {
  cart: CartItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  totalCount: number;
  paidAmount: number;
  dueAmount: number;
  customerName: string;
  customerPhone: string;
  addToCart: (product: any, qty?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  setDiscount: (val: number) => void;
  setPaidAmount: (val: number) => void;
  setCustomerInfo: (name: string, phone?: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType>({} as any);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('নগদ কাস্টমার');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalAmount = Math.max(0, subtotal - discount);
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const dueAmount = Math.max(0, totalAmount - paidAmount);

  const addToCart = (product: any, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      const price = Number(product.price || product.sellingPrice || 0);
      if (existing) {
        return prev.map(i => {
          if (i.id === product.id) {
            const newQty = i.quantity + qty;
            return { ...i, quantity: newQty, totalPrice: newQty * price };
          }
          return i;
        });
      }
      return [
        ...prev,
        {
          id: product.id || String(Date.now()),
          name: product.name || product.banglaName,
          banglaName: product.banglaName || product.name,
          quantity: qty,
          unit: product.unit || 'পিস',
          unitPrice: price,
          totalPrice: qty * price
        }
      ];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(prev =>
      prev.map(i => {
        if (i.id === id) {
          return { ...i, quantity: qty, totalPrice: qty * i.unitPrice };
        }
        return i;
      })
    );
  };

  const setCustomerInfo = (name: string, phone = '') => {
    setCustomerName(name);
    setCustomerPhone(phone);
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setPaidAmount(0);
    setCustomerName('নগদ কাস্টমার');
    setCustomerPhone('');
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        subtotal,
        discount,
        totalAmount,
        totalCount,
        paidAmount,
        dueAmount,
        customerName,
        customerPhone,
        addToCart,
        removeFromCart,
        updateQuantity,
        setDiscount,
        setPaidAmount,
        setCustomerInfo,
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
