import { describe, it, expect, beforeEach } from "vitest";
import { deepMerge, getTourConfig } from "@/lib/tour/registry";
import { loadTourState, saveTourState, resetTourState, DEFAULT_TOUR_STATE } from "@/lib/tour/storage";
import { createMockSupabase, createMockResponse, createSuccessfulQueryResponse } from "./helpers/supabase-mock";

describe("Tour Registry", () => {
  describe("deepMerge", () => {
    it("merges simple objects", () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      expect(deepMerge(target, source)).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("merges nested objects recursively", () => {
      const target = { a: { x: 1, y: 2 }, b: 3 };
      const source = { a: { y: 99, z: 100 } };
      expect(deepMerge(target, source)).toEqual({ a: { x: 1, y: 99, z: 100 }, b: 3 });
    });

    it("deep merges nested objects without sharing references", () => {
      const inner = { x: 1 };
      const target = { a: inner };
      const source = { a: { y: 2 } };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: { x: 1, y: 2 } });
      inner.x = 999;
      expect(result.a).not.toEqual({ x: 999, y: 2 });
    });

    it("handles empty source", () => {
      const target = { a: 1, b: 2 };
      expect(deepMerge(target, {})).toEqual({ a: 1, b: 2 });
    });

    it("handles empty target", () => {
      const result = deepMerge({}, { a: 1 });
      expect(result).toEqual({ a: 1 });
    });

    it("source overrides target for same key", () => {
      const target = { a: 1, b: { c: 2 } };
      const source = { b: "override" };
      expect(deepMerge(target, source)).toEqual({ a: 1, b: "override" });
    });
  });

  describe("getTourConfig", () => {
    const brandSlug = "test-brand";

    it("returns correct missions for MASTER_ADMIN", () => {
      const config = getTourConfig(brandSlug, "MASTER_ADMIN");
      expect(config.role).toBe("MASTER_ADMIN");
      expect(config.missions.length).toBe(4);
      expect(config.missions.map((m) => m.id)).toEqual([
        "business-setup",
        "inventory-setup",
        "payment-setup",
        "shift-setup",
      ]);
    });

    it("returns correct missions for PLATFORM_OWNER", () => {
      const config = getTourConfig(brandSlug, "PLATFORM_OWNER");
      expect(config.missions.length).toBe(5);
      expect(config.missions.map((m) => m.id)).toEqual([
        "business-setup",
        "inventory-setup",
        "payment-setup",
        "shift-setup",
        "first-service",
      ]);
    });

    it("returns correct missions for FRONTLINER", () => {
      const config = getTourConfig(brandSlug, "FRONTLINER");
      expect(config.missions.length).toBe(1);
      expect(config.missions[0].id).toBe("first-service");
    });

    it("returns correct missions for TECHNICIAN", () => {
      const config = getTourConfig(brandSlug, "TECHNICIAN");
      expect(config.missions.length).toBe(1);
      expect(config.missions[0].id).toBe("first-service");
    });

    it("returns default missions for unknown role", () => {
      const config = getTourConfig(brandSlug, "UNKNOWN_ROLE");
      expect(config.missions.length).toBe(1);
      expect(config.missions[0].id).toBe("first-service");
    });

    it("passes brandSlug to mission builders", () => {
      const config = getTourConfig("custom-shop", "ADMIN");
      config.missions.forEach((mission) => {
        expect(mission.title).toBeTruthy();
        expect(mission.description).toBeTruthy();
        expect(mission.steps).toBeDefined();
      });
    });

    it("returns all missions when no feature flags defined on any mission", () => {
      const config = getTourConfig(brandSlug, "PLATFORM_OWNER", ["some-flag"]);
      const ids = config.missions.map((m) => m.id);
      expect(ids.length).toBe(5);
      expect(ids).toContain("payment-setup");
      expect(ids).toContain("inventory-setup");
      expect(ids).toContain("business-setup");
      expect(ids).toContain("shift-setup");
      expect(ids).toContain("first-service");
    });

    it("all missions have valid structure", () => {
      const roles = ["PLATFORM_OWNER", "MASTER_ADMIN", "ADMIN", "FRONTLINER", "TECHNICIAN"];
      roles.forEach((role) => {
        const config = getTourConfig(brandSlug, role);
        config.missions.forEach((mission) => {
          expect(mission.id).toBeTruthy();
          expect(mission.title).toBeTruthy();
          expect(mission.difficulty).toMatch(/^(beginner|intermediate|advanced)$/);
          expect(mission.estimatedTime).toMatch(/^\d+m$/);
          expect(Array.isArray(mission.steps)).toBe(true);
          mission.steps.forEach((step) => {
            expect(step.id).toBeTruthy();
            expect(step.title).toBeTruthy();
            expect(step.position).toMatch(/^(top|bottom|left|right|center)$/);
            expect(step.missionId).toBe(mission.id);
          });
        });
      });
    });
  });
});

describe("Tour Storage", () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  describe("loadTourState", () => {
    it("returns default state when no data found", async () => {
      mockSupabase.mockMaybeSingle.mockResolvedValue(
        createMockResponse(null)
      );

      const state = await loadTourState("user-123", mockSupabase.mockSupabase);
      expect(state).toEqual(DEFAULT_TOUR_STATE);
    });

    it("returns default state on error", async () => {
      mockSupabase.mockMaybeSingle.mockResolvedValue(
        createMockResponse(null, new Error("DB error"))
      );

      const state = await loadTourState("user-123", mockSupabase.mockSupabase);
      expect(state).toEqual(DEFAULT_TOUR_STATE);
    });

    it("returns parsed state when data exists", async () => {
      const savedState = {
        tour_version: 2,
        completed_at: "2026-07-01T00:00:00Z",
        skipped_at: null,
        last_step: 5,
        last_mission: "business-setup",
        completed_missions: ["business-setup"],
        dismissed_missions: [],
      };
      mockSupabase.mockMaybeSingle.mockResolvedValue(
        createSuccessfulQueryResponse({ tour_state: savedState })
      );

      const state = await loadTourState("user-123", mockSupabase.mockSupabase);
      expect(state).toEqual(savedState);
    });

    it("queries user_preferences by user_id", async () => {
      mockSupabase.mockMaybeSingle.mockResolvedValue(
        createMockResponse(null)
      );

      await loadTourState("user-456", mockSupabase.mockSupabase);
      expect(mockSupabase.mockFrom).toHaveBeenCalledWith("user_preferences");
      expect(mockSupabase.mockEq).toHaveBeenCalledWith("user_id", "user-456");
      expect(mockSupabase.mockSelect).toHaveBeenCalledWith("tour_state");
    });
  });

  describe("saveTourState", () => {
    it("merges partial state with current state", async () => {
      mockSupabase.mockMaybeSingle.mockResolvedValue(
        createSuccessfulQueryResponse({
          tour_state: { ...DEFAULT_TOUR_STATE, completed_missions: ["business-setup"] },
        })
      );

      await saveTourState("user-123", { last_mission: "business-setup" }, mockSupabase.mockSupabase);

      const updateCall = mockSupabase.mockUpdate.mock.calls[0][0];
      expect(updateCall.tour_state.completed_missions).toEqual(["business-setup"]);
      expect(updateCall.tour_state.last_mission).toBe("business-setup");
      expect(updateCall.updated_at).toBeTruthy();
    });

    it("writes merged state to user_preferences", async () => {
      mockSupabase.mockMaybeSingle.mockResolvedValue(
        createSuccessfulQueryResponse({ tour_state: DEFAULT_TOUR_STATE })
      );

      await saveTourState("user-789", { last_step: 3 }, mockSupabase.mockSupabase);

      expect(mockSupabase.mockFrom).toHaveBeenCalledWith("user_preferences");
      expect(mockSupabase.mockEq).toHaveBeenCalledWith("user_id", "user-789");
    });

    it("handles missing current state gracefully", async () => {
      mockSupabase.mockMaybeSingle.mockResolvedValue(
        createMockResponse(null)
      );

      await saveTourState("user-new", { last_step: 1 }, mockSupabase.mockSupabase);

      const updateCall = mockSupabase.mockUpdate.mock.calls[0][0];
      expect(updateCall.tour_state.tour_version).toBe(DEFAULT_TOUR_STATE.tour_version);
      expect(updateCall.tour_state.last_step).toBe(1);
    });
  });

  describe("resetTourState", () => {
    it("resets to default state", async () => {
      mockSupabase.mockMaybeSingle.mockResolvedValue(
        createSuccessfulQueryResponse({
          tour_state: {
            ...DEFAULT_TOUR_STATE,
            completed_missions: ["business-setup", "inventory-setup"],
            completed_at: "2026-07-01T00:00:00Z",
          },
        })
      );

      await resetTourState("user-123", mockSupabase.mockSupabase);

      const updateCall = mockSupabase.mockUpdate.mock.calls[0][0];
      expect(updateCall.tour_state).toEqual(DEFAULT_TOUR_STATE);
    });
  });
});
