// @ts-nocheck
// WIP POS module. Do not import into active routes until POS schema/actions are finalized.
"use client";

import * as React from "react";
import { ProductBrowser } from "./product-browser";
import { CartPanel } from "./cart-panel";
import type { PosCartItem, PosProductResult, PosTradeIn, CreatePosSaleInput, CartDeviceUnit } from "@/domain/pos/types";
import { generateCartKey } from "@/domain/pos/calculate-pos";
import { searchPosProductsAction, createPosSaleAction } from "@/server/actions/pos.actions";

/* ─── State ─── */

interface PosPageState {
  products: PosProductResult[];
  totalProducts: number;
  cart: PosCartItem[];
  customerId?: string;
  customerQuickCreate?: { name: string; phone?: string };
  tradeIn?: PosTradeIn;
  discountAmount: number;
  loading: boolean;
  submitting: boolean;
  error?: string;
  success?: { saleNumber: string; totalPaid: number; changeAmount: number };
}

type PosAction =
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_PRODUCTS"; products: PosProductResult[]; total: number }
  | { type: "ADD_TO_CART"; item: PosCartItem }
  | { type: "REMOVE_FROM_CART"; cartKey: string }
  | { type: "UPDATE_QTY"; cartKey: string; quantity: number }
  | { type: "SET_DISCOUNT"; amount: number }
  | { type: "SET_CUSTOMER"; customerId: string }
  | { type: "SET_CUSTOMER_QUICK"; data: { name: string; phone?: string } }
  | { type: "SET_TRADE_IN"; tradeIn?: PosTradeIn }
  | { type: "CLEAR_CART" }
  | { type: "SET_SUBMITTING"; submitting: boolean }
  | { type: "SET_ERROR"; error?: string }
  | { type: "SET_SUCCESS"; data: { saleNumber: string; totalPaid: number; changeAmount: number } }
  | { type: "RESET" };

function posReducer(state: PosPageState, action: PosAction): PosPageState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_PRODUCTS":
      return { ...state, products: action.products, totalProducts: action.total, loading: false };
    case "ADD_TO_CART":
      return { ...state, cart: [...state.cart, action.item] };
    case "REMOVE_FROM_CART":
      return { ...state, cart: state.cart.filter((i) => i.cartKey !== action.cartKey) };
    case "UPDATE_QTY":
      return { ...state, cart: state.cart.map((i) => i.cartKey === action.cartKey ? { ...i, quantity: action.quantity } : i) };
    case "SET_DISCOUNT":
      return { ...state, discountAmount: action.amount };
    case "SET_CUSTOMER":
      return { ...state, customerId: action.customerId };
    case "SET_CUSTOMER_QUICK":
      return { ...state, customerQuickCreate: action.data };
    case "SET_TRADE_IN":
      return { ...state, tradeIn: action.tradeIn };
    case "CLEAR_CART":
      return { ...state, cart: [], customerId: undefined, tradeIn: undefined, discountAmount: 0 };
    case "SET_SUBMITTING":
      return { ...state, submitting: action.submitting };
    case "SET_ERROR":
      return { ...state, error: action.error, submitting: false };
    case "SET_SUCCESS":
      return { ...state, success: action.data, submitting: false, error: undefined };
    case "RESET":
      return { ...state, cart: [], customerId: undefined, customerQuickCreate: undefined, tradeIn: undefined, discountAmount: 0, submitting: false, error: undefined, success: undefined };
    default:
      return state;
  }
}

const initialState: PosPageState = {
  products: [],
  totalProducts: 0,
  cart: [],
  discountAmount: 0,
  loading: true,
  submitting: false,
};

/* ─── Main Component ─── */

interface PosPageClientProps {
  brandSlug: string;
}

export function PosPageClient({ brandSlug }: PosPageClientProps) {
  const [state, dispatch] = React.useReducer(posReducer, initialState);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string | undefined>();
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProducts = React.useCallback(async (query?: string, itemType?: string) => {
    dispatch({ type: "SET_LOADING", loading: true });
    const result = await searchPosProductsAction(brandSlug, { query, itemType, pageSize: 100 });
    if (result.success) {
      dispatch({ type: "SET_PRODUCTS", products: result.data.products, total: result.data.total });
    } else {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  }, [brandSlug]);

  React.useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => { loadProducts(value || undefined, typeFilter); }, 300);
  };

  const handleTypeFilter = (type?: string) => {
    setTypeFilter(type);
    loadProducts(searchQuery || undefined, type);
  };

  const handleAddToCart = (product: PosProductResult, quantity?: number, selectedUnit?: CartDeviceUnit) => {
    const existing = state.cart.find((i) => i.inventoryItemId === product.id && i.selectedUnit?.unitId === selectedUnit?.unitId);
    if (existing) {
      if (!selectedUnit) {
        dispatch({ type: "UPDATE_QTY", cartKey: existing.cartKey, quantity: existing.quantity + (quantity || 1) });
      }
      return;
    }
    dispatch({
      type: "ADD_TO_CART",
      item: {
        cartKey: generateCartKey(),
        inventoryItemId: product.id,
        itemType: product.itemType,
        productName: product.name,
        sku: product.sku,
        quantity: selectedUnit ? 1 : quantity || 1,
        unitPrice: selectedUnit?.sellingPrice ?? product.sellingPrice,
        costPrice: product.costPrice,
        discountAmount: 0,
        selectedUnit,
      },
    });
  };

  const handleSubmitSale = async (payment: { paymentMethodId: string; paymentAccountId: string; amount: number }) => {
    if (state.cart.length === 0) {
      dispatch({ type: "SET_ERROR", error: "Keranjang masih kosong." });
      return;
    }
    dispatch({ type: "SET_SUBMITTING", submitting: true });
    dispatch({ type: "SET_ERROR", error: undefined });

    const input: CreatePosSaleInput = {
      brandId: 0, branchId: "",
      cartItems: state.cart,
      tradeIn: state.tradeIn,
      payments: [payment],
      discountAmount: state.discountAmount,
      customerId: state.customerId,
      customerQuickCreate: state.customerQuickCreate,
    };

    const result = await createPosSaleAction(brandSlug, input);
    if (result.success) {
      dispatch({ type: "SET_SUCCESS", data: { saleNumber: result.data.saleNumber, totalPaid: result.data.paidAmount, changeAmount: result.data.changeAmount } });
    } else {
      dispatch({ type: "SET_ERROR", error: result.error });
    }
  };

  const handleReset = () => { dispatch({ type: "RESET" }); loadProducts(); };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="flex-1 min-w-0">
        <ProductBrowser
          products={state.products}
          loading={state.loading}
          searchQuery={searchQuery}
          typeFilter={typeFilter}
          onSearch={handleSearch}
          onTypeFilter={handleTypeFilter}
          onAddToCart={handleAddToCart}
          cartItemIds={new Set(state.cart.map((i) => i.inventoryItemId))}
          brandSlug={brandSlug}
        />
      </div>
      <div className="w-[400px] shrink-0">
        <CartPanel
          cart={state.cart}
          customerId={state.customerId}
          customerQuickCreate={state.customerQuickCreate}
          tradeIn={state.tradeIn}
          discountAmount={state.discountAmount}
          submitting={state.submitting}
          error={state.error}
          success={state.success}
          brandSlug={brandSlug}
          onRemoveItem={(key) => dispatch({ type: "REMOVE_FROM_CART", cartKey: key })}
          onUpdateQty={(key, qty) => dispatch({ type: "UPDATE_QTY", cartKey: key, quantity: qty })}
          onSetCustomer={(id) => dispatch({ type: "SET_CUSTOMER", customerId: id })}
          onSetCustomerQuick={(data) => dispatch({ type: "SET_CUSTOMER_QUICK", data })}
          onSetTradeIn={(t) => dispatch({ type: "SET_TRADE_IN", tradeIn: t })}
          onSetDiscount={(a) => dispatch({ type: "SET_DISCOUNT", amount: a })}
          onSubmitSale={handleSubmitSale}
          onReset={handleReset}
        />
      </div>
    </div>
  );
}
