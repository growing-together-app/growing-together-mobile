import { useCallback } from "react";
import { useAppDispatch } from "../redux/hooks";
import {
    updateGrowthRecord,
    updateHealthRecord,
} from "../redux/slices/healthSlice";
import {
    updateMemory,
} from "../redux/slices/memorySlice";
import {
    updateResponse,
} from "../redux/slices/promptResponseSlice";

export const useVisibilityUpdate = (
  memories: any[],
  responses: any[],
  healthRecords: any[],
  growthRecords: any[],
  forceUpdate: () => void
) => {
  const dispatch = useAppDispatch();

  const handleVisibilityUpdate = useCallback(async (
    itemId: string,
    visibility: "private" | "public"
  ) => {
    try {
      // Find the item type and update accordingly
      const memory = memories.find((m) => m.id === itemId);
      if (memory) {
        // Update memory visibility without triggering API re-fetch
        await dispatch(
          updateMemory({ memoryId: itemId, data: { visibility } })
        ).unwrap();
        
        return;
      }

      // Find the item type and update accordingly
      const response = responses.find((r) => r.id === itemId);
      if (response) {
        // Update response visibility without triggering API re-fetch
        await dispatch(
          updateResponse({ responseId: itemId, data: { visibility } })
        ).unwrap();
        
        return;
      }

      const healthRecord = healthRecords.find((h) => h.id === itemId);
      if (healthRecord) {
        await dispatch(
          updateHealthRecord({ recordId: itemId, data: { visibility } })
        ).unwrap();
        forceUpdate();
        return;
      }

      const growthRecord = growthRecords.find((g) => g.id === itemId);
      if (growthRecord) {
        await dispatch(
          updateGrowthRecord({ recordId: itemId, data: { visibility } })
        ).unwrap();
        forceUpdate();
        return;
      }

      // Item not found
    } catch (error) {
      throw error;
    }
  }, [memories, responses, healthRecords, growthRecords, dispatch, forceUpdate]);

  return {
    handleVisibilityUpdate,
  };
};
