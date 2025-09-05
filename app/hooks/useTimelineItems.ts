import React from "react";
import { safeDate } from "../utils/dateUtils";

export const useTimelineItems = (
  id: string,
  memories: any[],
  responses: any[],
  healthRecords: any[],
  growthRecords: any[],
  prompts: any[],
  currentUser: any
) => {
  // Create timeline items and filter them based on permissions
  const timelineItems = React.useMemo(() => {
    if (!id) return [];
    
    // Safety check for required data with default empty arrays
    const safeMemories = memories || [];
    const safeResponses = responses || [];
    const safeHealthRecords = healthRecords || [];
    const safeGrowthRecords = growthRecords || [];
    const safePrompts = prompts || [];

    const items: any[] = [];

    // Add memories
    const processedMemoryIds = new Set();
    safeMemories.forEach((memory) => {
      if (!processedMemoryIds.has(memory.id)) {
        processedMemoryIds.add(memory.id);

        // Extract creator info from parentId (which can be string or object)
        let creator = null;
        if (memory.parentId && typeof memory.parentId === "object") {
          creator = {
            id: memory.parentId._id || memory.parentId.id,
            firstName: memory.parentId.firstName,
            lastName: memory.parentId.lastName,
            avatar: memory.parentId.avatar,
          };
        }

        items.push({
          id: memory.id,
          type: "memory",
          title: memory.title,
          content: memory.content,
          date: memory.date,
          createdAt: memory.createdAt,
          media: memory.attachments,
          creator: creator, // Use extracted creator info
          creatorId: memory.parentId, // Store the creator ID for fallback
          visibility: memory.visibility,
          metadata: {
            visibility: memory.visibility,
            location: memory.location,
            tags: memory.tags,
          },
        });
      }
    });

    // Add Q&A responses
    const processedResponseIds = new Set();
    const filteredResponses = safeResponses.filter((response) => response.childId === id);
    
    filteredResponses.forEach(async (response) => {
      if (!processedResponseIds.has(response.id)) {
        processedResponseIds.add(response.id);

        let questionText = "Question not available";
        
        if (typeof response.promptId === "object" && response.promptId) {
          questionText =
            (response.promptId as any).question ||
            (response.promptId as any).title ||
            "Question not available";
        } else if (typeof response.promptId === "string") {
          // First try to find in prompts array
          const matchingPrompt = safePrompts.find(
            (p: any) => p.id === response.promptId
          );
        
          if (matchingPrompt) {
            questionText =
              matchingPrompt.content ||
              matchingPrompt.title ||
              "Question not available";
          } else {
            // Fallback: show promptId if prompt not found
            questionText = `Question ID: ${response.promptId}`;
          }
        }

        const qaItem = {
          id: response.id,
          type: "qa",
          title: questionText.length > 50 ? questionText.substring(0, 50) + "..." : questionText,
          content: response.content,
          date: safeDate(response.createdAt),
          createdAt: response.createdAt,
          media: response.attachments,
          visibility: response.visibility,
          creator: {
            id: response.parentId || currentUser?.id,
            firstName: currentUser?.firstName,
            lastName: currentUser?.lastName,
          },
          parentId: response.parentId || currentUser?.id,
          metadata: {
            promptId: response.promptId,
            feedback: response.feedback,
            question: questionText,
          },
        };
        
        items.push(qaItem);
      }
    });

    // Add health records
    const processedHealthIds = new Set();
    const filteredHealthRecords = safeHealthRecords.filter((record) => record.childId === id);
    
    filteredHealthRecords.forEach((record) => {
      if (!processedHealthIds.has(record.id)) {
        processedHealthIds.add(record.id);

        items.push({
          id: record.id,
          type: "health",
          title: record.title || "Health Record",
          content: record.description || record.notes || "",
          date: safeDate(record.date),
          createdAt: record.createdAt,
          media: record.attachments || [],
          visibility: record.visibility,
          creator: {
            id: record.parentId || currentUser?.id,
            firstName: currentUser?.firstName,
            lastName: currentUser?.lastName,
          },
          metadata: {
            recordType: record.recordType,
            date: record.date,
            location: record.location,
          },
        });
      }
    });

    // Add growth records
    const processedGrowthIds = new Set();
    const filteredGrowthRecords = safeGrowthRecords.filter((record) => record.childId === id);
    
    filteredGrowthRecords.forEach((record) => {
      if (!processedGrowthIds.has(record.id)) {
        processedGrowthIds.add(record.id);

        items.push({
          id: record.id,
          type: "growth",
          title: `Growth Record - ${record.measurementType}`,
          content: `${record.measurementType}: ${record.value} ${record.unit}`,
          date: safeDate(record.date),
          createdAt: record.createdAt,
          media: record.attachments || [],
          visibility: record.visibility,
          creator: {
            id: record.parentId || currentUser?.id,
            firstName: currentUser?.firstName,
            lastName: currentUser?.lastName,
          },
          metadata: {
            measurementType: record.measurementType,
            value: record.value,
            unit: record.unit,
            date: record.date,
          },
        });
      }
    });

    // Sort all items by createdAt in descending order (newest first)
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [id, memories, responses, healthRecords, growthRecords, prompts, currentUser]);

  // Filter timeline items based on user permissions
  // In child profile, owner should see ALL posts (both public and private)
  const filteredTimelineItems = timelineItems; // Owner sees all posts

  return {
    timelineItems,
    filteredTimelineItems,
  };
};
