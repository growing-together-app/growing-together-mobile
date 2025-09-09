// AskChildModal.tsx
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppDispatch } from "../../redux/hooks";
import { createResponse } from "../../redux/slices/promptResponseSlice";
import { createPrompt } from "../../redux/slices/promptSlice";
import {
  CreatePromptData,
  CreatePromptResponseData,
  Prompt,
} from "../../services/promptService";
import { getAgeRange } from "../../utils/childUtils";
import PrimaryButton from "../form/PrimaryButton";
import MultiMediaPicker, { MediaFile } from "../media/MultiMediaPicker";
import QuestionDropdownModal from "./QuestionDropdownModal";

interface AskChildModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    _question: Prompt | string,
    _answer: string,
    _attachment?: string
  ) => void;
  systemQuestions: Prompt[];
  childId: string;
  childBirthdate?: string; // Add birthdate prop
}

export default function AskChildModal({
  visible,
  onClose,
  onSave,
  systemQuestions,
  childId,
  childBirthdate,
}: AskChildModalProps) {
  const dispatch = useAppDispatch();
  const [questionType, setQuestionType] = useState<"system" | "custom">(
    "system"
  );
  const [selectedQuestion, setSelectedQuestion] = useState<Prompt | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [attachments, setAttachments] = useState<MediaFile[]>([]);
  const [showDropdownModal, setShowDropdownModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Debug: Log when selectedQuestion changes
  useEffect(() => {
    // console.log('AskChildModal: selectedQuestion changed:', selectedQuestion);
  }, [selectedQuestion]);

  useEffect(() => {
    if (visible) {
      setQuestionType("system");
      setSelectedQuestion(null);
      setCustomQuestion("");
      setAnswer("");
      setAttachments([]);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!answer.trim()) return;

    // Debug: Log the childId value
    // console.log('AskChildModal: childId value:', childId);
    // console.log('AskChildModal: childId type:', typeof childId);
    // console.log('AskChildModal: childId length:', childId?.length);

    // Validate childId
    if (!childId || typeof childId !== "string" || childId.trim() === "") {
      console.error("AskChildModal: Invalid childId:", childId);
      Alert.alert("Error", "Invalid child ID. Please try again.");
      return;
    }

    setIsSaving(true);

    try {
      if (questionType === "system" && selectedQuestion) {
        // Case 2: User selects system question - only create response

        // Convert MediaFile objects to the format expected by the service
        const convertedAttachments = attachments.map((file) => ({
          uri: file.uri,
          type:
            file.type === "image"
              ? "image/jpeg"
              : file.type === "video"
              ? "video/mp4"
              : "audio/mpeg",
          name: file.filename,
        }));

        const responseData: CreatePromptResponseData = {
          promptId: selectedQuestion.id,
          childId: childId.trim(),
          content: answer.trim(),
          attachments: convertedAttachments as any,
        };

        await dispatch(createResponse(responseData)).unwrap();

        // Show success message
        Alert.alert("Success", "Your answer has been saved successfully!", [
          {
            text: "OK",
            onPress: () => {
              onSave(
                selectedQuestion,
                answer.trim(),
                attachments.length > 0 ? attachments[0].uri : undefined
              );
              onClose();
            },
          },
        ]);
      } else if (questionType === "custom" && customQuestion.trim()) {
        // Case 1: User asks custom question - create prompt first, then response


        // Validate custom question data
        const trimmedQuestion = customQuestion.trim();
        if (!trimmedQuestion) {
          Alert.alert("Error", "Please enter a valid question.");
          return;
        }

        // Check minimum length requirement (10 characters)
        if (trimmedQuestion.length < 10) {
          Alert.alert("Error", "Question must be at least 10 characters long.");
          return;
        }

        // Check maximum length requirement (500 characters)
        if (trimmedQuestion.length > 500) {
          Alert.alert("Error", "Question cannot exceed 500 characters.");
          return;
        }

        // Calculate age range from birth date
        const ageRange = childBirthdate ? getAgeRange(childBirthdate) : "4-6";

        const promptData: CreatePromptData = {
          title: trimmedQuestion,
          content: trimmedQuestion,
          category: "other", // Valid enum value from schema
          frequency: "daily", // Valid enum value from schema
          ageRange: ageRange, // Use calculated age range
          tags: ["user-generated"],
        };

        const newPrompt = await dispatch(createPrompt(promptData)).unwrap();


        // Now create response with the new prompt ID
        // Convert MediaFile objects to the format expected by the service
        const convertedAttachments = attachments.map((file) => ({
          uri: file.uri,
          type:
            file.type === "image"
              ? "image/jpeg"
              : file.type === "video"
              ? "video/mp4"
              : "audio/mpeg",
          name: file.filename,
        }));

        const responseData: CreatePromptResponseData = {
          promptId: newPrompt.id,
          childId: childId.trim(),
          content: answer.trim(),
          attachments: convertedAttachments as any,
        };

        await dispatch(createResponse(responseData)).unwrap();

        // Show success message
        Alert.alert(
          "Success",
          "Your question and answer have been saved successfully!",
          [
            {
              text: "OK",
              onPress: () => {
                onSave(
                  newPrompt,
                  answer.trim(),
                  attachments.length > 0 ? attachments[0].uri : undefined
                );
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert("Please fill in the question and answer.");
      }
    } catch (error: any) {
      // Show detailed error message
      let errorMessage =
        "Failed to save question and answer. Please try again.";

      // Try to extract error details from different possible structures
      if (error.payload) {
        if (typeof error.payload === "string") {
          errorMessage = error.payload;
        } else if (error.payload.response) {
          // Handle the new error structure from Redux slice
          if (typeof error.payload.response === "string") {
            errorMessage = error.payload.response;
          } else if (error.payload.response.message) {
            errorMessage = error.payload.response.message;
          } else if (error.payload.response.error) {
            errorMessage = error.payload.response.error;
          } else if (error.payload.response.details) {
            errorMessage = `Validation error: ${error.payload.response.details}`;
          }
        } else if (error.payload.details) {
          errorMessage = `Validation error: ${error.payload.details}`;
        } else if (error.payload.message) {
          errorMessage = error.payload.message;
        } else if (error.payload.error) {
          errorMessage = error.payload.error;
        }
      } else if (error.data) {
        if (error.data.message) {
          errorMessage = error.data.message;
        } else if (error.data.error) {
          errorMessage = error.data.error;
        }
      } else if (error.message) {
        // Handle JSON string error messages
        if (
          typeof error.message === "string" &&
          error.message.startsWith("{")
        ) {
          try {
            const parsedError = JSON.parse(error.message);
            if (parsedError.details && Array.isArray(parsedError.details)) {
              // Extract the first validation error message
              errorMessage =
                parsedError.details[0]?.message || "Validation failed";
            } else if (parsedError.error) {
              errorMessage = parsedError.error;
            }
          } catch {
            // If parsing fails, use the original message
            errorMessage = error.message;
          }
        } else if (error.message.includes("Validation failed")) {
          errorMessage = "Please check your input and try again.";
        } else if (
          error.message.includes("network") ||
          error.message.includes("connection")
        ) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const isDisabled =
    !answer.trim() ||
    (questionType === "system" && !selectedQuestion) ||
    (questionType === "custom" && !customQuestion.trim());

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Ask Your Child</Text>

          {/* Question Type Selection */}
          <View style={styles.radioGroup}>
            <TouchableOpacity
              onPress={() => setQuestionType("system")}
              style={styles.radioRow}
            >
              <View
                style={[
                  styles.radio,
                  questionType === "system" && styles.radioSelected,
                ]}
              />
              <Text style={styles.radioText}>Use system question</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setQuestionType("custom")}
              style={styles.radioRow}
            >
              <View
                style={[
                  styles.radio,
                  questionType === "custom" && styles.radioSelected,
                ]}
              />
              <Text style={styles.radioText}>Write your own question</Text>
            </TouchableOpacity>
          </View>

          {/* Question Input */}
          {questionType === "system" ? (
            <TouchableOpacity
              onPress={() => setShowDropdownModal(true)}
              style={styles.dropdownBox}
            >
              <Text style={styles.dropdownText}>
                {selectedQuestion?.title ||
                  selectedQuestion?.content ||
                  "Select a question"}
              </Text>

            </TouchableOpacity>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Enter your question"
              value={customQuestion}
              onChangeText={setCustomQuestion}
            />
          )}

          {/* Answer Input */}
          <TextInput
            style={[styles.input, { height: 100 }]}
            multiline
            placeholder="Enter your answer"
            value={answer}
            onChangeText={setAnswer}
            textAlignVertical="top"
          />

          {/* Attachments */}
          <MultiMediaPicker
            onMediaPicked={setAttachments}
            maxFiles={5}
            allowedTypes={["image", "video", "audio"]}
            maxFileSize={50}
          />

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.cancelButton, isSaving && styles.disabledButton]}
              disabled={isSaving}
            >
              <Text
                style={[styles.cancelText, isSaving && styles.disabledText]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <PrimaryButton
              title={isSaving ? "Saving..." : "Save Question & Answer"}
              onPress={handleSubmit}
              disabled={isDisabled || isSaving}
            />
          </View>

          {/* Loading indicator */}
          {isSaving && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>
                Saving your question and answer...
              </Text>
            </View>
          )}

          {/* Dropdown Question Selector */}
          <QuestionDropdownModal
            visible={showDropdownModal}
            onClose={() => setShowDropdownModal(false)}
            onSelect={(q) => {

              setSelectedQuestion(q);
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0006",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#fff",
    padding: 20,
    width: "90%",
    borderRadius: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  radioGroup: { marginBottom: 20 },
  radioRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#888",
    marginRight: 8,
  },
  radioSelected: { backgroundColor: "#007aff", borderColor: "#007aff" },
  radioText: { fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  dropdownBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  dropdownText: { fontSize: 16, color: "#333" },
  buttonRow: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelText: { color: "#666", fontSize: 16 },
  disabledButton: { opacity: 0.5 },
  disabledText: { color: "#999" },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  loadingText: {
    color: "#666",
    fontSize: 14,
    marginLeft: 8,
    fontStyle: "italic",
  },

});
