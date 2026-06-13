// @ts-nocheck
// WIP POS module. Do not import into active routes until POS schema/actions are finalized.
"use client";

import * as React from "react";
import { ProductBrowser } from "./product-browser";
import { CartPanel } from "./cart-panel";
import type { PosCartItem, PosProductResult, PosTradeIn, CreatePosSaleInput, CartDeviceUnit } from "@/domain/pos/types";
import { generateCartKey } from "@/domain/pos/calculate-pos";
import { searchPosProductsAction, createPosSaleAction, getPosPaymentMethodsAction } from "@/server/actions/pos.actions";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { useSetPosCart } from "./pos-cart-context";

/* ─── State ─── */

interface PosPageState {
  products: PosProductResult[];
  totalProducts: number;
  paymentMethods: Array<{ id: string; name: string; type: string }>;
  cart: PosCartItem[];
  customerId?: string;
  customerQuickCreate?: { name: string; phone?: string };
  tradeIn?: PosTradeIn;
  discountAmount: number;
  loading: boolean;
  submitting: boolean;
  error?: string;
  success?: {
    saleNumber: string;
    grossAmount: number;
    discountAmount: number;
    tradeInAmount: number;
    amountDue: number;
    paidAmount: number;
    changeAmount: number;
    mdrAmount: number;
    netAmount: number;
  };
}

type PosAction =
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_PRODUCTS"; products: PosProductResult[]; total: number }
  | { type: "SET_PAYMENT_METHODS"; methods: Array<{ id: string; name: string; type: string }> }
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
  | { type: "SET_SUCCESS"; data: NonNullable<PosPageState["success"]> }
  | { type: "RESET" };

function posReducer(state: PosPageState, action: PosAction): PosPageState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_PRODUCTS":
      return { ...state, products: action.products, totalProducts: action.total, loading: false };
    case "SET_PAYMENT_METHODS":
      return { ...state, paymentMethods: action.methods };
    case "ADD_TO_CART":
      return { ...state, cart: [...state.cart, action.item] };
    case "REMOVE_FROM_CART":
      const nextCart = state.cart.filter((i) => i.cartKey !== action.cartKey);
      return {
        ...state,
        cart: nextCart,
        tradeIn: nextCart.some((i) => i.itemType === "DEVICE_UNIT") ? state.tradeIn : undefined,
      };
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
  paymentMethods: [],
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
  const { activeBranchId, activeBranchName } = useActiveBranch();
  const setCartProps = useSetPosCart();

  const loadProducts = React.useCallback(async (query?: string, itemType?: string) => {
    if (!activeBranchId) {
      dispatch({ type: "SET_PRODUCTS", products: [], total: 0 });
      dispatch({ type: "SET_ERROR", error: "Pilih cabang POS terlebih dahulu." });
      return;
    }

    dispatch({ type: "SET_LOADING", loading: true });
    const result = await searchPosProductsAction(brandSlug, { branchId: activeBranchId, query, itemType, pageSize: 100 });
    if (result.success) {
      dispatch({ type: "SET_PRODUCTS", products: result.data.products, total: result.data.total });
      dispatch({ type: "SET_ERROR", error: undefined });
    } else {
      dispatch({ type: "SET_LOADING", loading: false });
      dispatch({ type: "SET_ERROR", error: result.error });
    }
  }, [activeBranchId, brandSlug]);

  React.useEffect(() => {
    loadProducts();
    getPosPaymentMethodsAction(brandSlug).then((result) => {
      if (result.success) {
        dispatch({ type: "SET_PAYMENT_METHODS", methods: result.data });
      }
    });
  }, [brandSlug, loadProducts]);

  React.useEffect(() => {
    dispatch({ type: "CLEAR_CART" });
  }, [activeBranchId]);

  React.useEffect(() => {
    if (state.tradeIn && !state.cart.some((item) => item.itemType === "DEVICE_UNIT")) {
      dispatch({ type: "SET_TRADE_IN", tradeIn: undefined });
    }
  }, [state.cart, state.tradeIn]);

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
        inventoryItemUnitId: selectedUnit?.unitId,
      },
    });
  };

  // Stable callbacks for context (avoids unnecessary re-renders)
  const stateRef = React.useRef(state);
  React.useEffect(() => { stateRef.current = state; }, [state]);

  const handleSubmitSale = React.useCallback(async (payment: { paymentMethodId: string; amount: number }) => {
    const st = stateRef.current;
    if (st.cart.length === 0) {
      dispatch({ type: "SET_ERROR", error: "Keranjang masih kosong." });
      return;
    }

    const missingDeviceUnit = st.cart.find((item) => item.itemType === "DEVICE_UNIT" && !item.inventoryItemUnitId && !item.selectedUnit?.unitId);
    if (missingDeviceUnit) {
      dispatch({ type: "SET_ERROR", error: `Pilih unit/IMEI untuk "${missingDeviceUnit.productName}" terlebih dahulu.` });
      return;
    }

    const hasDeviceUnit = st.cart.some((item) => item.itemType === "DEVICE_UNIT");
    if (st.tradeIn && !hasDeviceUnit) {
      dispatch({ type: "SET_ERROR", error: "Tukar tambah hanya tersedia untuk penjualan unit/device." });
      return;
    }

    if (st.tradeIn && (!st.tradeIn.deviceBrand || !st.tradeIn.deviceModel || !st.tradeIn.appraisalValue || st.tradeIn.appraisalValue <= 0)) {
      dispatch({ type: "SET_ERROR", error: "Data tukar tambah belum lengkap." });
      return;
    }

    if (!payment.paymentMethodId) {
      dispatch({ type: "SET_ERROR", error: "Metode pembayaran wajib dipilih." });
      return;
    }

    if (!payment.amount || payment.amount <= 0) {
      dispatch({ type: "SET_ERROR", error: "Nominal pembayaran tidak valid." });
      return;
    }

    dispatch({ type: "SET_SUBMITTING", submitting: true });
    dispatch({ type: "SET_ERROR", error: undefined });

    const input: CreatePosSaleInput = {
      cartItems: st.cart,
      tradeIn: hasDeviceUnit ? st.tradeIn : undefined,
      payments: [payment],
      paymentAmount: payment.amount,
      discountAmount: st.discountAmount,
      customerId: st.customerId,
      customerQuickCreate: st.customerQuickCreate,
      branchId: activeBranchId,
      idempotencyKey: `pos-ui:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    };

    const result = await createPosSaleAction(brandSlug, input);
    if (result.success) {
      dispatch({
        type: "SET_SUCCESS",
        data: {
          saleNumber: result.data.saleNumber,
          grossAmount: result.data.grossAmount,
          discountAmount: result.data.discountAmount,
          tradeInAmount: result.data.tradeInAmount,
          amountDue: result.data.amountDue,
          paidAmount: result.data.paidAmount,
          changeAmount: result.data.changeAmount,
          mdrAmount: result.data.mdrAmount,
          netAmount: result.data.netAmount,
        },
      });
    } else {
      const message = result.error?.includes("record_pos_sale_v2")
        ? "RPC POS belum tersedia. Pastikan migration 018 sudah diterapkan."
        : result.error;
      dispatch({ type: "SET_ERROR", error: message });
    }
  }, [dispatch, activeBranchId, brandSlug]);

  const handleReset = React.useCallback(() => {
    dispatch({ type: "RESET" });
    loadProducts();
  }, [dispatch, loadProducts]);

  // Push cart data to context for desktop cart sidebar
  React.useEffect(() => {
    setCartProps({
      cart: state.cart,
      customerId: state.customerId,
      customerQuickCreate: state.customerQuickCreate,
      tradeIn: state.tradeIn,
      discountAmount: state.discountAmount,
      submitting: state.submitting,
      error: state.error,
      success: state.success,
      paymentMethods: state.paymentMethods,
      brandSlug,
      onRemoveItem: (key) => dispatch({ type: "REMOVE_FROM_CART", cartKey: key }),
      onUpdateQty: (key, qty) => dispatch({ type: "UPDATE_QTY", cartKey: key, quantity: qty }),
      onSetCustomer: (id) => dispatch({ type: "SET_CUSTOMER", customerId: id }),
      onSetCustomerQuick: (data) => dispatch({ type: "SET_CUSTOMER_QUICK", data }),
      onSetTradeIn: (t) => dispatch({ type: "SET_TRADE_IN", tradeIn: t }),
      onSetDiscount: (a) => dispatch({ type: "SET_DISCOUNT", amount: a }),
      onSubmitSale: handleSubmitSale,
      onReset: handleReset,
    });
  }, [
    state.cart, state.customerId, state.customerQuickCreate,
    state.tradeIn, state.discountAmount, state.submitting,
    state.error, state.success, state.paymentMethods,
    brandSlug, handleSubmitSale, handleReset, setCartProps, dispatch,
  ]);

  // Clean up context on unmount
  React.useEffect(() => {
    return () => setCartProps(null);
  }, [setCartProps]);

  return (
    <div className="flex h-full min-h-0 w-full">
      <section className="min-w-0 flex-1 w-full overflow-y-auto overflow-x-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {activeBranchName && (
          <div className="mb-3 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Cabang POS aktif: <span className="font-medium text-foreground">{activeBranchName}</span>
          </div>
        )}
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
          branchId={activeBranchId}
        />
      </section>

      {/* Mobile cart — below products, hidden on lg+ */}
      <aside className="relative z-10 mt-4 w-full shrink-0 bg-background lg:hidden">
        <CartPanel
          cart={state.cart}
          customerId={state.customerId}
          customerQuickCreate={state.customerQuickCreate}
          tradeIn={state.tradeIn}
          discountAmount={state.discountAmount}
          submitting={state.submitting}
          error={state.error}
          success={state.success}
          paymentMethods={state.paymentMethods}
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
      </aside>
    </div>
  );
}
