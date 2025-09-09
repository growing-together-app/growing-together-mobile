import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { addChildToFamilyGroup, fetchChildren } from "../../redux/slices/childSlice";
import AddButton from "../ui/AddButton";
import LoadingSpinner from "../ui/LoadingSpinner";

interface AddChildToGroupModalProps {
  visible: boolean;
  onClose: () => void;
  familyGroupId: string;
  familyGroupName: string;
  onGroupUpdated?: () => void; // Callback to notify parent component
  existingChildren?: any[]; // Children already in the group
}

export default function AddChildToGroupModal({
  visible,
  onClose,
  familyGroupId,
  familyGroupName,
  onGroupUpdated,
  existingChildren = [],
}: AddChildToGroupModalProps) {
  const dispatch = useAppDispatch();
  const { children, loading } = useAppSelector((state) => state.children);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset selected children when modal opens
      setSelectedChildIds([]);
      dispatch(fetchChildren()).catch((error) => {
        console.error("Error fetching children:", error);
        Alert.alert("Error", "Failed to load children. Please try again.");
      });
    } else {
      // Reset selected children when modal closes
      setSelectedChildIds([]);
    }
  }, [visible, dispatch]);

  // Show all children but mark those already in the group
  const allChildren = children.filter((child) => {
    // Ensure child has required fields
    return child && child.id && child.name;
  });

  // Function to check if a child is already in the group
  const isChildInGroup = (childId: string) => {
    const isInGroup = existingChildren.some(existingChild => 
      existingChild.id === childId || existingChild._id === childId
    );
    

    
    return isInGroup;
  };



  const handleAddChildToGroup = async () => {
    
    if (selectedChildIds.length === 0) {
      Alert.alert("Error", "Please select at least one child to add to the group");
      return;
    }
    
    // Validate that all selected children exist and are not already in the group
    const selectedChildren = allChildren.filter(child => selectedChildIds.includes(child.id));
    if (selectedChildren.length !== selectedChildIds.length) {
      Alert.alert("Error", "Some selected children not found. Please try again.");
      return;
    }
    
    // Check if any child is already in the group
    const alreadyInGroup = selectedChildIds.filter(childId => isChildInGroup(childId));
    if (alreadyInGroup.length > 0) {
      Alert.alert("Error", "Some selected children are already in the group.");
      return;
    }

    setUpdating(true);

    try {
      // Add all selected children to the group
      const promises = selectedChildIds.map(childId => 
        dispatch(addChildToFamilyGroup({
          childId: childId,
          data: {
            familyGroupId: familyGroupId,
            role: 'secondary' // Default to secondary role
          }
        })).unwrap()
      );
      
      const results = await Promise.all(promises);

      // Notify parent component that group was updated (let parent handle refresh)
      if (onGroupUpdated) {
        onGroupUpdated();
      }

      Alert.alert(
        "Success",
        `${selectedChildIds.length} child${selectedChildIds.length > 1 ? 'ren' : ''} has been added to the family group successfully!`,
        [{ text: "OK", onPress: onClose }]
      );
    } catch (error: any) {
      console.error("Error adding children to group:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        url: error.url
      });

      let errorMessage = "Failed to add children to group";
      
      // Handle specific error types
      if (error.name === 'AlreadyMemberError' || error.message?.includes('Child is already a member of this family group')) {
        errorMessage = "Some children are already members of this family group";
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.status === 404) {
        errorMessage = "Family group or child not found";
      } else if (error.status === 403) {
        errorMessage = "You do not have permission to add children to this group";
      } else if (error.status === 409) {
        errorMessage = "Some children are already members of this family group";
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setUpdating(false);
    }
  };



  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Children to Group</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Select children to add to &quot;{familyGroupName}&quot;
          </Text>

          {loading ? (
            <LoadingSpinner message="Loading children..." />
          ) : (
            <>
              {!children || children.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="child-care" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>
                    No children found. Please add a child first.
                  </Text>
                </View>
              ) : allChildren.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="child-care" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>
                    No children found. Please add a child first.
                  </Text>
                </View>
              ) : (
                <>

                  {/* Select/Deselect All Button */}
                  <TouchableOpacity
                    style={styles.selectAllButton}
                    onPress={() => {
                      const availableChildIds = allChildren
                        .filter(child => !isChildInGroup(child.id))
                        .map(child => child.id);
                      
                      if (selectedChildIds.length === availableChildIds.length) {
                        // Deselect all
                        setSelectedChildIds([]);
                      } else {
                        // Select all available
                        setSelectedChildIds(availableChildIds);
                      }
                    }}
                  >
                    <Text style={styles.selectAllButtonText}>
                      {selectedChildIds.length === allChildren.filter(child => !isChildInGroup(child.id)).length
                        ? 'Deselect All'
                        : 'Select All Available'
                      }
                    </Text>
                  </TouchableOpacity>

                  {/* Children list */}
                  <ScrollView 
                    style={styles.childrenList}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {allChildren.map((child: any, index: number) => {
                      const isSelected = selectedChildIds.includes(child.id);
                      const isInGroup = isChildInGroup(child.id);
                      
                      return (
                        <View key={child.id} style={styles.simpleChildItem}>
                          <Text style={styles.simpleChildText}>
                            {index + 1}. {child.name} ({child.gender})
                          </Text>
                          <TouchableOpacity
                            style={[
                              styles.simpleSelectButton,
                              isSelected && styles.selectedButton,
                              isInGroup && styles.alreadyInGroupButton
                            ]}
                            onPress={() => {
                              if (!isInGroup) {
                            
                                if (isSelected) {
                                  // Remove from selection
                                  setSelectedChildIds(prev => prev.filter(id => id !== child.id));
                                } else {
                                  // Add to selection
                                  setSelectedChildIds(prev => [...prev, child.id]);
                                }
                              }
                            }}
                            disabled={isInGroup}
                          >
                            <Text style={[
                              styles.simpleSelectText,
                              isSelected && styles.selectedButtonText,
                              isInGroup && styles.alreadyInGroupText
                            ]}>
                              {isInGroup 
                                ? "✓ Already in Group" 
                                : isSelected 
                                  ? "✓ Selected"
                                  : "Select"
                              }
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                </>
              )}
            </>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={updating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <AddButton
              title={`Add ${selectedChildIds.length > 0 ? `(${selectedChildIds.length})` : ''} to Group`}
              onPress={handleAddChildToGroup}
              variant="modal"
              disabled={selectedChildIds.length === 0 || updating}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: "85%",
    width: "90%",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  childrenList: {
    marginBottom: 20,
    maxHeight: 300,
    minHeight: 150,
  },
  childItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedChildItem: {
    borderColor: "#4f8cff",
    backgroundColor: "#e0e7ff",
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  childDetails: {
    fontSize: 14,
    color: "#666",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },


  simpleChildItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 8,
  },
  simpleChildText: {
    fontSize: 16,
    color: "#333",
  },
  simpleSelectButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#e0e0e0",
    borderRadius: 6,
  },
  simpleSelectText: {
    fontSize: 14,
    color: "#4f8cff",
    fontWeight: "600",
  },
  selectedButton: {
    backgroundColor: "#4f8cff",
  },
  selectedButtonText: {
    color: "#fff",
  },
  alreadyInGroupButton: {
    backgroundColor: "#e0e0e0",
  },
  alreadyInGroupText: {
    color: "#999",
  },
  selectAllButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 12,
    alignItems: "center",
  },
  selectAllButtonText: {
    fontSize: 14,
    color: "#4f8cff",
    fontWeight: "600",
  },
});
