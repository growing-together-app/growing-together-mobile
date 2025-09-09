import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Child } from "../../services/childService";

interface ChildProfileHeaderProps {
  currentChild: Child;
  onEdit: () => void;
  onDelete: () => void;
}

export const ChildProfileHeader: React.FC<ChildProfileHeaderProps> = ({
  currentChild,
  onEdit,
  onDelete,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getAge = (birthdate: string) => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return `${age} years old`;
  };

  return (
    <View style={styles.childHeader}>
      <View style={styles.childInfo}>
        {currentChild.avatarUrl ? (
          <Image source={{ uri: currentChild.avatarUrl }} style={styles.childAvatar} />
        ) : (
          <View style={styles.childAvatarPlaceholder}>
            <MaterialIcons name="person" size={40} color="#ccc" />
          </View>
        )}
        <View style={styles.childDetails}>
          <Text style={styles.childName}>
            {currentChild.firstName} {currentChild.lastName}
          </Text>
          {currentChild.nickname && (
            <Text style={styles.childNickname}>&ldquo;{currentChild.nickname}&rdquo;</Text>
          )}
          <Text style={styles.childAge}>{getAge(currentChild.birthdate)}</Text>
          <Text style={styles.childBirthdate}>
            Born {formatDate(currentChild.birthdate)}
          </Text>
          {/* Bio field removed as it doesn't exist in Child interface */}
        </View>
      </View>

      <View style={styles.profileHeader}>
        <Text style={styles.contentTitle}>Profile Details</Text>
        <View style={styles.profileActions}>
          <TouchableOpacity style={styles.editButton} onPress={onEdit}>
            <MaterialIcons name="edit" size={20} color="#4f8cff" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <MaterialIcons name="delete" size={20} color="#e53935" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.profileDetails}>
        <View style={styles.profileItem}>
          <Text style={styles.profileLabel}>First Name:</Text>
          <Text style={styles.profileValue}>{currentChild.firstName}</Text>
        </View>
        <View style={styles.profileItem}>
          <Text style={styles.profileLabel}>Last Name:</Text>
          <Text style={styles.profileValue}>{currentChild.lastName}</Text>
        </View>
        {currentChild.nickname && (
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Nickname:</Text>
            <Text style={styles.profileValue}>{currentChild.nickname}</Text>
          </View>
        )}
        <View style={styles.profileItem}>
          <Text style={styles.profileLabel}>Birthdate:</Text>
          <Text style={styles.profileValue}>
            {formatDate(currentChild.birthdate)}
          </Text>
        </View>
        <View style={styles.profileItem}>
          <Text style={styles.profileLabel}>Age:</Text>
          <Text style={styles.profileValue}>
            {getAge(currentChild.birthdate)}
          </Text>
        </View>
        {currentChild.gender && (
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Gender:</Text>
            <Text style={styles.profileValue}>
              {currentChild.gender.charAt(0).toUpperCase() +
                currentChild.gender.slice(1)}
            </Text>
          </View>
        )}
        <View style={styles.profileItem}>
          <Text style={styles.profileLabel}>Created:</Text>
          <Text style={styles.profileValue}>
            {formatDate(currentChild.createdAt)}
          </Text>
        </View>
        <View style={styles.profileItem}>
          <Text style={styles.profileLabel}>Last Updated:</Text>
          <Text style={styles.profileValue}>
            {formatDate(currentChild.updatedAt)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  childHeader: {
    backgroundColor: "#f8f9ff",
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  childInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  childAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  childAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  childDetails: {
    flex: 1,
  },
  childName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  childNickname: {
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 4,
  },
  childAge: {
    fontSize: 18,
    color: "#4f8cff",
    fontWeight: "600",
    marginBottom: 4,
  },
  childBirthdate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  childBio: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  profileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 20,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  profileActions: {
    flexDirection: "row",
    gap: 10,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f7fa",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  editButtonText: {
    color: "#00796b",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffebee",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteButtonText: {
    color: "#c62828",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  profileDetails: {
    backgroundColor: "#f8f9ff",
    borderRadius: 12,
    padding: 16,
  },
  profileItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  profileLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    width: 100,
  },
  profileValue: {
    fontSize: 16,
    color: "#666",
    flex: 1,
  },
});
