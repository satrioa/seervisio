import { vi } from "vitest";

export function createMockSupabase() {
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockEq = vi.fn();
  const mockIn = vi.fn();
  const mockOrder = vi.fn();
  const mockLimit = vi.fn();
  const mockSingle = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockRpc = vi.fn();
  const mockGte = vi.fn();
  const mockLte = vi.fn();
  const mockIs = vi.fn();
  const mockNot = vi.fn();
  const mockOr = vi.fn();
  const mockReturns = vi.fn();

  const mockChainable = {
    select: mockSelect.mockReturnThis(),
    insert: mockInsert.mockReturnThis(),
    update: mockUpdate.mockReturnThis(),
    delete: mockDelete.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    in: mockIn.mockReturnThis(),
    gte: mockGte.mockReturnThis(),
    lte: mockLte.mockReturnThis(),
    is: mockIs.mockReturnThis(),
    not: mockNot.mockReturnThis(),
    or: mockOr.mockReturnThis(),
    order: mockOrder.mockReturnThis(),
    limit: mockLimit.mockReturnThis(),
    single: mockSingle.mockReturnThis(),
    maybeSingle: mockMaybeSingle.mockReturnThis(),
    returns: mockReturns.mockReturnThis(),
  };

  mockSelect.mockReturnValue(mockChainable);
  mockInsert.mockReturnValue(mockChainable);
  mockUpdate.mockReturnValue(mockChainable);
  mockDelete.mockReturnValue(mockChainable);
  mockEq.mockReturnValue(mockChainable);
  mockIn.mockReturnValue(mockChainable);
  mockOrder.mockReturnValue(mockChainable);
  mockLimit.mockReturnValue(mockChainable);
  mockGte.mockReturnValue(mockChainable);
  mockLte.mockReturnValue(mockChainable);
  mockIs.mockReturnValue(mockChainable);
  mockNot.mockReturnValue(mockChainable);
  mockOr.mockReturnValue(mockChainable);

  mockFrom.mockReturnValue(mockChainable);

  const mockSupabase = {
    from: mockFrom,
    rpc: mockRpc,
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  };

  return {
    mockSupabase,
    mockFrom,
    mockSelect,
    mockInsert,
    mockUpdate,
    mockDelete,
    mockEq,
    mockIn,
    mockOrder,
    mockLimit,
    mockSingle,
    mockMaybeSingle,
    mockRpc,
    mockChainable,
  };
}

export function createMockResponse<T>(
  data: T | null,
  error: any = null,
  count: number | null = null,
) {
  return { data, error, count };
}

export function mockServerSupabase(mockImpl: ReturnType<typeof createMockSupabase>) {
  vi.mock("@/lib/supabase/server", () => ({
    createServerSupabase: vi.fn(() => mockImpl.mockSupabase),
  }));
}

export function createSuccessfulQueryResponse(data: any) {
  return Promise.resolve({ data, error: null });
}

export function createErrorQueryResponse(errorMsg: string) {
  return Promise.resolve({ data: null, error: new Error(errorMsg) });
}
