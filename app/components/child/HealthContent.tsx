import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { deleteGrowthRecord, deleteHealthRecord, fetchGrowthRecords, fetchHealthRecords, updateGrowthRecord } from '../../redux/slices/healthSlice';
import { GrowthFilter, GrowthRecord, HealthFilter, HealthRecord } from '../../types/health';
import AddGrowthRecordModal from '../health/AddGrowthRecordModal';
import AddHealthRecordModal from '../health/AddHealthRecordModal';
import EditGrowthRecordModal from '../health/EditGrowthRecordModal';
import EditHealthRecordModal from '../health/EditHealthRecordModal';
import GrowthChart from '../health/GrowthChart';
import HealthRecordItem from '../health/HealthRecordItem';
import AddButton from '../ui/AddButton';
import { DeleteButton, EditButton } from '../ui/EditDeleteButtons';
import ErrorView from '../ui/ErrorView';
import SectionCard from '../ui/SectionCard';
import VisibilityToggle from '../ui/VisibilityToggle';

interface HealthContentProps {
  childId: string;
  editingHealthItem?: any; // Health record to be edited from timeline
  editingGrowthItem?: any; // Growth record to be edited from timeline
  onEditComplete?: () => void; // Callback to notify parent when edit is complete
  renderModalsOnly?: boolean; // If true, only render modals without UI content
  skipDataFetch?: boolean; // If true, skip API calls for data fetching
}

const HealthContent: React.FC<HealthContentProps> = ({ childId, editingHealthItem, editingGrowthItem, onEditComplete, renderModalsOnly = false, skipDataFetch = false }) => {
  const dispatch = useAppDispatch();
  
  // Get current user and children for permission checking
  const currentUser = useAppSelector((state) => state.auth.user);
  const { children } = useAppSelector((state) => state.children);
  
  // Check if current user is the owner of the child
  const getParentId = (parentId: any) => {
    if (typeof parentId === 'string') return parentId;
    if (parentId && typeof parentId === 'object' && parentId._id) return parentId._id;
    if (parentId && typeof parentId === 'object' && parentId.id) return parentId.id;
    return null;
  };
  
  const isOwner = currentUser && childId && 
    children && children.some(child => {
      const childIdValue = child.id;
      const childParentId = getParentId(child.parentId);
      const currentUserId = currentUser.id;
      
      return childIdValue === childId && childParentId === currentUserId;
    });
  

  
  // Modal state
  const [showAddGrowthModal, setShowAddGrowthModal] = useState(false);
  const [showAddHealthModal, setShowAddHealthModal] = useState(false);
  const [showEditGrowthModal, setShowEditGrowthModal] = useState(false);
  const [showEditHealthModal, setShowEditHealthModal] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<GrowthRecord | null>(null);
  const [healthRecordToEdit, setHealthRecordToEdit] = useState<HealthRecord | null>(null);
  
  // Health filter state
  const [healthFilter] = useState<HealthFilter>({
    type: 'all',
    dateRange: 'all'  // Changed from '6months' to 'all' to get all historical data
  });

  // Growth filter state
  const [growthFilter] = useState<GrowthFilter>({
    type: 'height',
    dateRange: 'all'
  });

  // Get health data from Redux
  const healthState = useAppSelector((state) => state.health);
  const growthRecords = (healthState && Array.isArray(healthState.growthRecords)) ? healthState.growthRecords : [];
  const healthRecords = (healthState && Array.isArray(healthState.healthRecords)) ? healthState.healthRecords : [];
  const healthLoading = healthState?.loading || false;
  const healthError = healthState?.error || null;

  // Get child data for age calculation
  const { currentChild } = useAppSelector((state) => state.children);

  // Calculate child's age in months with better accuracy
  const getChildAgeInMonths = useCallback(() => {
    if (!currentChild?.birthdate) return 0;
    const birthDate = new Date(currentChild.birthdate);
    const today = new Date();
    
    let months = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                 (today.getMonth() - birthDate.getMonth());
    
    // Adjust for day of month
    if (today.getDate() < birthDate.getDate()) {
      months--;
    }
    
    return Math.max(0, months);
  }, [currentChild?.birthdate]);

  // Consolidated data fetching function
  const fetchHealthData = useCallback(() => {
    if (childId) {
      // Fetch all growth records without filter to get both height and weight data
      dispatch(fetchGrowthRecords({ childId }));
      dispatch(fetchHealthRecords({ childId, filter: healthFilter }));
    }
  }, [childId, dispatch, healthFilter]);

  // Load health data for this child
  useEffect(() => {
    if (childId && !skipDataFetch) {
      dispatch(fetchHealthRecords({ childId, filter: healthFilter }));
      dispatch(fetchGrowthRecords({ childId, filter: growthFilter }));
    }
  }, [childId, dispatch, healthFilter, growthFilter, skipDataFetch]);

  // Handle editing items from timeline
  useEffect(() => {
    if (editingHealthItem && editingHealthItem.id) {
      setHealthRecordToEdit(editingHealthItem);
      setShowEditHealthModal(true);
    } else if (!editingHealthItem && showEditHealthModal && healthRecordToEdit === null) {
      // Only close modal if editingHealthItem is reset AND healthRecordToEdit is null
      // This prevents closing modal when editing directly from Health tab
      setShowEditHealthModal(false);
    }
  }, [editingHealthItem, showEditHealthModal, healthRecordToEdit]);

  useEffect(() => {
    if (editingGrowthItem && editingGrowthItem.id) {
      setRecordToEdit(editingGrowthItem);
      setShowEditGrowthModal(true);
    } else if (!editingGrowthItem && showEditGrowthModal && recordToEdit === null) {
      // Only close modal if editingGrowthItem is reset AND recordToEdit is null
      // This prevents closing modal when editing directly from Health tab
      setShowEditGrowthModal(false);
    }
  }, [editingGrowthItem, showEditGrowthModal, recordToEdit]);

  // Handle edit completion from timeline
  useEffect(() => {
    if (editingHealthItem) {
      // Handle health item edit from timeline
    } else {
      // Reset editing health item
    }
  }, [editingHealthItem]);

  // Handle growth item edit from timeline
  useEffect(() => {
    if (editingGrowthItem) {
      // Handle growth item edit from timeline
    } else {
      // Reset editing growth item
    }
  }, [editingGrowthItem]);

  // Fetch health data when component mounts or filter changes
  useEffect(() => {
    if (!skipDataFetch) {
      fetchHealthData();
    }
  }, [fetchHealthData, skipDataFetch]);

  // Handle growth record deletion
  const handleDeleteGrowthRecord = useCallback(async (recordId: string) => {
    Alert.alert(
      'Delete Growth Record',
      'Are you sure you want to delete this growth record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteGrowthRecord(recordId)).unwrap();
              fetchHealthData();
            } catch (error) {
              console.error('Failed to delete growth record:', error);
            }
          },
        },
      ]
    );
  }, [dispatch, fetchHealthData]);

  // Handle health record deletion
  const handleDeleteHealthRecord = useCallback(async (recordId: string) => {
    Alert.alert(
      'Delete Health Record',
      'Are you sure you want to delete this health record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteHealthRecord(recordId)).unwrap();
              fetchHealthData();
            } catch (error) {
              console.error('Failed to delete health record:', error);
            }
          },
        },
      ]
    );
  }, [dispatch, fetchHealthData]);

  // Handle modal success
  const handleGrowthModalSuccess = useCallback(() => {
    setShowAddGrowthModal(false);
    fetchHealthData();
  }, [fetchHealthData]);

  const handleHealthModalSuccess = useCallback(() => {
    setShowAddHealthModal(false);
    fetchHealthData();
  }, [fetchHealthData]);

  // Handle visibility update for growth records
  const handleVisibilityUpdate = useCallback(async (recordId: string, newVisibility: 'private' | 'public') => {
    try {
      await dispatch(updateGrowthRecord({ recordId, data: { visibility: newVisibility } })).unwrap();
      fetchHealthData();
    } catch (error) {
      console.error('Failed to update growth record visibility:', error);
    }
  }, [dispatch, fetchHealthData]);

  // Handle edit modal
  const handleEditGrowthRecord = useCallback((record: GrowthRecord) => {
    setRecordToEdit(record);
    setShowEditGrowthModal(true);
  }, []);

  const handleEditModalSuccess = useCallback(() => {
    setShowEditGrowthModal(false);
    setRecordToEdit(null);
    fetchHealthData();
    // Reset the editing item from timeline to prevent re-triggering the edit modal
    if (editingGrowthItem) {
      onEditComplete?.();
    }
  }, [fetchHealthData, editingGrowthItem, onEditComplete]);

  const handleEditModalClose = useCallback(() => {
    setShowEditGrowthModal(false);
    setRecordToEdit(null);
    // Reset the editing item from timeline to prevent re-triggering the edit modal
    if (editingGrowthItem) {
      onEditComplete?.();
    }
  }, [editingGrowthItem, onEditComplete]);

  // Handle edit health record
  const handleEditHealthRecord = useCallback((record: HealthRecord) => {
    setHealthRecordToEdit(record);
    setShowEditHealthModal(true);
  }, []);

  const handleEditHealthModalSuccess = useCallback(() => {
    setShowEditHealthModal(false);
    setHealthRecordToEdit(null);
    fetchHealthData();
    // Reset the editing item from timeline to prevent re-triggering the edit modal
    if (editingHealthItem) {
      // Notify parent component that edit is complete
      onEditComplete?.();
    }
  }, [fetchHealthData, editingHealthItem, onEditComplete]);

  const handleEditHealthModalClose = useCallback(() => {
    setShowEditHealthModal(false);
    setHealthRecordToEdit(null);
    // Reset the editing item from timeline to prevent re-triggering the edit modal
    if (editingHealthItem) {
      // Notify parent component that edit is complete
      onEditComplete?.();
    }
  }, [editingHealthItem, onEditComplete]);

  if (healthLoading) {
    return (
      <View style={styles.contentContainer}>
        <Text style={styles.contentTitle}>Health & Growth</Text>
        <View style={styles.loadingContainer}>
          <Text>Loading health data...</Text>
        </View>
      </View>
    );
  }

  if (healthError) {
    return (
      <View style={styles.contentContainer}>
        <Text style={styles.contentTitle}>Health & Growth</Text>
        <ErrorView 
          message={healthError} 
          onRetry={fetchHealthData}
        />
      </View>
    );
  }

  const childAgeInMonths = getChildAgeInMonths();
  const childGender = currentChild?.gender as 'male' | 'female' || 'male';

  if (renderModalsOnly) {
    return (
      <>
        <AddGrowthRecordModal
          visible={showAddGrowthModal}
          onClose={() => setShowAddGrowthModal(false)}
          childId={childId}
          onSuccess={handleGrowthModalSuccess}
        />

        <AddHealthRecordModal
          visible={showAddHealthModal}
          onClose={() => setShowAddHealthModal(false)}
          childId={childId}
          onSuccess={handleHealthModalSuccess}
        />

        <EditGrowthRecordModal
          visible={showEditGrowthModal}
          onClose={handleEditModalClose}
          record={recordToEdit}
          onSuccess={handleEditModalSuccess}
        />

        <EditHealthRecordModal
          visible={showEditHealthModal}
          onClose={handleEditHealthModalClose}
          record={healthRecordToEdit}
          onSuccess={handleEditHealthModalSuccess}
        />
      </>
    );
  }

  return (
    <View style={styles.healthContainer}>
      {/* Growth Section */}
      <SectionCard title="Growth Tracking">
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionSubtitle}>Height & Weight</Text>
          {isOwner && (
            <AddButton
              title="Add Record"
              onPress={() => setShowAddGrowthModal(true)}
              variant="primary"
              iconSize={18}
            />
          )}
        </View>

        {/* Growth Charts */}
        <View style={styles.chartsContainer}>
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Weight</Text>
            <GrowthChart 
              data={growthRecords} 
              type="weight" 
              childAgeInMonths={childAgeInMonths}
              childGender={childGender}
              childBirthDate={currentChild?.birthdate}
            />
          </View>
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Height</Text>
            <GrowthChart 
              data={growthRecords} 
              type="height" 
              childAgeInMonths={childAgeInMonths}
              childGender={childGender}
              childBirthDate={currentChild?.birthdate}
            />
          </View>
        </View>

        {/* Growth Records Table */}
        {growthRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="trending-up" size={48} color={Colors.light.text} />
            <Text style={styles.emptyStateText}>No growth records yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first height or weight measurement to start tracking
            </Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Date</Text>
              <Text style={styles.tableHeaderText}>Type</Text>
              <Text style={styles.tableHeaderText}>Value</Text>
              <Text style={styles.tableHeaderText}>Unit</Text>
              <Text style={styles.tableHeaderText}>Age</Text>
              <Text style={styles.tableHeaderText}>Visibility</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Actions</Text>
            </View>
            
            {/* Table Rows */}
            {growthRecords.map((record) => {
              const recordDate = new Date(record.date);
              const recordAgeInMonths = currentChild?.birthdate ? 
                Math.max(0, (recordDate.getFullYear() - new Date(currentChild.birthdate).getFullYear()) * 12 + 
                (recordDate.getMonth() - new Date(currentChild.birthdate).getMonth())) : 0;
              
              return (
                <View key={record.id} style={styles.tableRow}>
                  <Text style={styles.tableCell}>
                    {recordDate.toLocaleDateString('vi-VN', {
                      month: 'numeric',
                      day: 'numeric',
                      year: '2-digit'
                    })}
                  </Text>
                  <View style={styles.tableCell}>
                    {record.type === 'height' ? (
                      <MaterialIcons name="height" size={20} color={Colors.light.primary} />
                    ) : (
                      <MaterialIcons name="fitness-center" size={20} color={Colors.light.primary} />
                    )}
                  </View>
                  <Text style={styles.tableCell}>
                    {record.value}
                  </Text>
                  <Text style={styles.tableCell}>
                    {record.unit}
                  </Text>
                  <Text style={styles.tableCell}>
                    {recordAgeInMonths}m
                  </Text>
                  <View style={styles.tableCellVisibility}>
                    {record.visibility && isOwner && (
                      <VisibilityToggle
                        visibility={record.visibility}
                        onUpdate={(newVisibility) => handleVisibilityUpdate(record.id, newVisibility)}
                        size="small"
                      />
                    )}
                  </View>
                  <View style={styles.actionButtonsRow}>
                    {isOwner && (
                      <>
                        <EditButton onPress={() => handleEditGrowthRecord(record)} style={{ padding: 4 }} size={16} />
                        <DeleteButton onPress={() => handleDeleteGrowthRecord(record.id)} style={{ padding: 4, marginLeft: 4 }} size={16} />
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </SectionCard>

      {/* Health Records Section */}
      <SectionCard title="Health Records">
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionSubtitle}>Medical History</Text>
          {isOwner && (
            <AddButton
              title="Add Record"
              onPress={() => setShowAddHealthModal(true)}
              variant="primary"
              iconSize={18}
            />
          )}
        </View>

        {/* Health Records Timeline */}
        {healthRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="healing" size={48} color={Colors.light.text} />
            <Text style={styles.emptyStateText}>No health records yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add vaccinations, illnesses, or medications to track health history
            </Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {healthRecords.map((record, index) => (
              <HealthRecordItem
                key={record.id}
                record={record}
                onDelete={() => handleDeleteHealthRecord(record.id)}
                onEdit={() => handleEditHealthRecord(record)}
                isLast={index === healthRecords.length - 1}
              />
            ))}
          </View>
        )}
      </SectionCard>

      {/* Modals */}
      <AddGrowthRecordModal
        visible={showAddGrowthModal}
        onClose={() => setShowAddGrowthModal(false)}
        childId={childId}
        onSuccess={handleGrowthModalSuccess}
      />

      <AddHealthRecordModal
        visible={showAddHealthModal}
        onClose={() => setShowAddHealthModal(false)}
        childId={childId}
        onSuccess={handleHealthModalSuccess}
      />

      <EditGrowthRecordModal
        visible={showEditGrowthModal}
        onClose={handleEditModalClose}
        record={recordToEdit}
        onSuccess={handleEditModalSuccess}
      />
      
      <EditHealthRecordModal
        visible={showEditHealthModal}
        onClose={handleEditHealthModalClose}
        record={healthRecordToEdit}
        onSuccess={handleEditHealthModalSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  contentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.light.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthContainer: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 32,
  },
  recordsList: {
    marginTop: 16,
  },
  timelineContainer: {
    marginTop: 16,
  },
  chartsContainer: {
    marginBottom: 10,
  },
  chartSection: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  tableContainer: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.light.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    flex: 1,
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableCell: {
    fontSize: 12,
    color: Colors.light.text,
    flex: 1,
    textAlign: 'left',
  },
  tableCellVisibility: {
    flexBasis: 80,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 64,
  },
  actionButton: {
    padding: 8,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  deleteButton: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
});

export default HealthContent; 