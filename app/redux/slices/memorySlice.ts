import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { CreateMemoryData, GetMemoriesParams, Memory, UpdateMemoryData } from '../../services/memoryService';
import * as memoryService from '../../services/memoryService';
import { conditionalLog } from '../../utils/logUtils';

// Async thunks
export const fetchMemories = createAsyncThunk(
  'memories/fetchMemories',
  async (params: GetMemoriesParams) => {
    return await memoryService.getMemories(params);
  }
);

export const fetchMemory = createAsyncThunk(
  'memories/fetchMemory',
  async (memoryId: string) => {
    return await memoryService.getMemoryById(memoryId);
  }
);

export const createMemory = createAsyncThunk(
  'memory/createMemory',
  async (data: CreateMemoryData, { rejectWithValue }) => {
    try {
      conditionalLog.memoryRedux('Redux createMemory thunk called with data:', data);
      const result = await memoryService.createMemory(data);
      conditionalLog.memoryRedux('Redux createMemory thunk success:', result);
      return result;
    } catch (error: any) {
      conditionalLog.memoryRedux('Redux createMemory thunk error:', error);
      return rejectWithValue(error.message || 'Failed to create memory');
    }
  }
);

export const updateMemory = createAsyncThunk(
  'memories/updateMemory',
  async ({ memoryId, data }: { memoryId: string; data: UpdateMemoryData & { attachments?: any[] } }, { rejectWithValue }) => {
    try {
      conditionalLog.memoryRedux('Redux updateMemory thunk called with:', { memoryId, data });
      const result = await memoryService.updateMemory(memoryId, data);
      conditionalLog.memoryRedux('Redux updateMemory thunk success:', result);
      return result;
    } catch (error: any) {
      conditionalLog.memoryRedux('Redux updateMemory thunk error:', error);
      return rejectWithValue(error.message || 'Failed to update memory');
    }
  }
);

export const updateMemoryAttachments = createAsyncThunk(
  'memories/updateMemoryAttachments',
  async ({ memoryId, attachments, action, attachmentIds }: { 
    memoryId: string; 
    attachments: any[]; 
    action?: 'add' | 'remove' | 'replace';
    attachmentIds?: string[];
  }, { rejectWithValue }) => {
    try {
      conditionalLog.memoryRedux('Redux updateMemoryAttachments thunk called with:', { memoryId, attachments, action, attachmentIds });
      const result = await memoryService.updateMemoryAttachments(memoryId, attachments, action, attachmentIds);
      conditionalLog.memoryRedux('Redux updateMemoryAttachments thunk success:', result);
      return result;
    } catch (error: any) {
      conditionalLog.memoryRedux('Redux updateMemoryAttachments thunk error:', error);
      return rejectWithValue(error.message || 'Failed to update memory attachments');
    }
  }
);

export const deleteMemory = createAsyncThunk(
  'memories/deleteMemory',
  async (memoryId: string) => {
    await memoryService.deleteMemory(memoryId);
    return memoryId;
  }
);

// State interface
interface MemoryState {
  memories: Memory[];
  currentMemory: Memory | null;
  loading: boolean;
  updating: boolean; // Separate loading state for update operations
  error: string | null;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Initial state
const initialState: MemoryState = {
  memories: [],
  currentMemory: null,
  loading: false,
  updating: false, // Initialize updating state
  error: null,
  total: 0,
  page: 1,
  limit: 10,
  hasMore: true,
};

// Memory slice
const memorySlice = createSlice({
  name: 'memories',
  initialState,
  reducers: {
    clearCurrentMemory: (state) => {
      state.currentMemory = null;
    },
    clearMemories: (state) => {
      state.memories = [];
      state.total = 0;
      state.page = 1;
      state.hasMore = true;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch memories
    builder
      .addCase(fetchMemories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMemories.fulfilled, (state, action) => {
        state.loading = false;
        const { memories, total, page, limit } = action.payload;
        
        // Sort memories by createdAt in descending order (newest first) as a fallback
        const sortedMemories = [...memories].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        // If its the first page, replace memories
        if (page === 1) {
          state.memories = sortedMemories;
        } else {
          // Otherwise, append to existing memories and resort
          const allMemories = [...state.memories, ...sortedMemories];
          // Remove duplicates by ID and sort
          const uniqueMemories = Array.from(
            new Map(allMemories.map(memory => [memory.id, memory])).values()
          );
          state.memories = uniqueMemories.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        
        state.total = total;
        state.page = page;
        state.limit = limit;
        state.hasMore = memories.length === limit;
      })
      .addCase(fetchMemories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch memories';
      });

    // Fetch single memory
    builder
      .addCase(fetchMemory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMemory.fulfilled, (state, action) => {
        state.loading = false;
        state.currentMemory = action.payload;
      })
      .addCase(fetchMemory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch memory';
      });

    // Create memory
    builder
      .addCase(createMemory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMemory.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // Add new memory to the beginning of the list, but check for duplicates first
        const newMemory = action.payload;
        const existingIndex = state.memories.findIndex(m => m.id === newMemory.id);
        if (existingIndex === -1) { // Memory doesn't exist, add it
          state.memories.unshift(newMemory);
          state.total += 1;
        } else { // Memory already exists, update it instead
          state.memories[existingIndex] = newMemory;
        }
      })
      .addCase(createMemory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create memory';
      });

    // Update memory
    builder
      .addCase(updateMemory.pending, (state) => {
        state.updating = true; // Use updating instead of loading
        state.error = null;
      })
      .addCase(updateMemory.fulfilled, (state, action) => {
        state.updating = false; // Use updating instead of loading
        state.error = null;
        
        const updatedMemory = action.payload;
        const index = state.memories.findIndex(memory => memory.id === updatedMemory.id);
        
        if (index !== -1) {
          state.memories[index] = updatedMemory;
        } else {
          // Add to list if not found (shouldn't happen but defensive programming)
          state.memories.unshift(updatedMemory);
        }
        
        // Update currentMemory if it's the same memory
        if (state.currentMemory && state.currentMemory.id === updatedMemory.id) {
          state.currentMemory = updatedMemory;
        }
      })
      .addCase(updateMemory.rejected, (state, action) => {
        state.updating = false; // Use updating instead of loading
        state.error = action.payload as string;
      });

    // Update memory attachments
    builder
      .addCase(updateMemoryAttachments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMemoryAttachments.fulfilled, (state, action) => {
        state.loading = false;
        const updatedMemory = action.payload;
        
        // Update in memories list
        const index = state.memories.findIndex(m => m.id === updatedMemory.id);
        if (index !== -1) {
          state.memories[index] = updatedMemory;
        }
        
        // Update current memory if it's the same one
        if (state.currentMemory?.id === updatedMemory.id) {
          state.currentMemory = updatedMemory;
        }
      })
      .addCase(updateMemoryAttachments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update memory attachments';
      });

    // Delete memory
    builder
      .addCase(deleteMemory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMemory.fulfilled, (state, action) => {
        state.loading = false;
        const deletedMemoryId = action.payload;
        
        // Remove from memories list
        state.memories = state.memories.filter(m => m.id !== deletedMemoryId);
        state.total -= 1;
        
        // Clear current memory if it's the deleted one
        if (state.currentMemory?.id === deletedMemoryId) {
          state.currentMemory = null;
        }
      })
      .addCase(deleteMemory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete memory';
      });
  },
});

export const { clearCurrentMemory, clearMemories, setError, clearError } = memorySlice.actions;
export default memorySlice.reducer; 