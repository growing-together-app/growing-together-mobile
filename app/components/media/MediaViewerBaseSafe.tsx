import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

// Generic attachment interface
interface BaseAttachment {
  id?: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  fileName?: string;
  fileSize?: number;
}

interface MediaViewerBaseSafeProps<T extends BaseAttachment> {
  attachments: T[];
  maxPreviewCount?: number;
  onAttachmentPress?: (attachment: T, index: number) => void;
  renderCustomContent?: (_attachment: T, _index: number) => React.ReactNode;
}

const { width: screenWidth } = Dimensions.get("window");
const MAX_PREVIEW_COUNT = 2; // Show only 2 items initially

export default function MediaViewerBaseSafe<T extends BaseAttachment>({
  attachments,
  maxPreviewCount = MAX_PREVIEW_COUNT,
  onAttachmentPress,
  renderCustomContent,
}: MediaViewerBaseSafeProps<T>) {
  const [selectedAttachment, setSelectedAttachment] =
    useState<T | null>(null);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [currentScrollIndex, setCurrentScrollIndex] = useState<number>(0);
  const [showCounter, setShowCounter] = useState<boolean>(true);
  const [modalKey, setModalKey] = useState<number>(0);
  const [_playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [audioToggleKey, setAudioToggleKey] = useState<number>(0);
  const [mutedStates, setMutedStates] = useState<Record<string, boolean>>({});
  const [modalOpeningKey, setModalOpeningKey] = useState<number>(0);
  const [_videoTimestamp, setVideoTimestamp] = useState<number>(Date.now());
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Process attachments safely
  const safeAttachments = useMemo(() => {
    if (!attachments || !Array.isArray(attachments)) {
      return [];
    }
    
    return attachments.filter(attachment => 
      attachment && 
      typeof attachment === 'object' && 
      attachment.url && 
      typeof attachment.url === 'string'
    );
  }, [attachments]);

  // Separate video attachments
  const videoAttachments = useMemo(() => {
    return safeAttachments.filter(attachment => 
      attachment.url && 
      /\.(mp4|mov|avi|mkv|webm)$/i.test(attachment.url)
    );
  }, [safeAttachments]);
  
  // Create individual video players at the top level with unique keys - always create all 5
  const player1 = useVideoPlayer({ uri: videoAttachments[0]?.url || '' }, (player) => {
    if (videoAttachments[0]) {
      player.loop = false;
      player.muted = false;
      player.volume = 1.0;
    }
  });
  
  const player2 = useVideoPlayer({ uri: videoAttachments[1]?.url || '' }, (player) => {
    if (videoAttachments[1]) {
      player.loop = false;
      player.muted = false;
      player.volume = 1.0;
    }
  });
  
  const player3 = useVideoPlayer({ uri: videoAttachments[2]?.url || '' }, (player) => {
    if (videoAttachments[2]) {
      player.loop = false;
      player.muted = false;
      player.volume = 1.0;
    }
  });
  
  const player4 = useVideoPlayer({ uri: videoAttachments[3]?.url || '' }, (player) => {
    if (videoAttachments[3]) {
      player.loop = false;
      player.muted = false;
      player.volume = 1.0;
    }
  });
  
  const player5 = useVideoPlayer({ uri: videoAttachments[4]?.url || '' }, (player) => {
    if (videoAttachments[4]) {
      player.loop = false;
      player.muted = false;
      player.volume = 1.0;
    }
  });

  const players = [player1, player2, player3, player4, player5];
  
  const videoPlayers = videoAttachments.map((attachment, index) => ({
    attachment: {
      ...attachment,
      id: attachment.id || attachment.url
    },
    player: players[index]
  }));

  // Helper function to get video player
  const getVideoPlayer = useCallback((attachment: T) => {
    if (!attachment.id) {
      const videoPlayer = videoPlayers.find(vp => vp.attachment.url === attachment.url);
      return videoPlayer?.player || null;
    }
    
    const videoPlayer = videoPlayers.find(vp => 
      vp.attachment.id === attachment.id || vp.attachment.url === attachment.url
    );
    
    return videoPlayer?.player || null;
  }, [videoPlayers]);

  // Control playing status
  const handleVideoPlay = useCallback((videoId: string) => {
    setPlayingVideoId(videoId);
  }, []);

  // Stop all videos when modal closes
  const handleModalClose = useCallback(() => {
    setShowFullScreen(false);
    setPlayingVideoId(null);
    
    // Force remount of video components by updating modal key
    setModalKey(prev => {
      const newKey = prev + 1;
      return newKey;
    });
  }, [modalKey]);

  // Reset video player when modal opens
  const handleModalOpen = useCallback((attachment: T) => {
    
    // Force video player reset by incrementing modalOpeningKey and updating timestamp
    setModalOpeningKey(prev => {
      const newKey = prev + 1;
      return newKey;
    });
    
    // Update video timestamp to force remounting
    setVideoTimestamp(Date.now());
    
    const actualIndex = safeAttachments.findIndex(att => att.id === attachment.id);
    setSelectedAttachment(attachment);
    setSelectedIndex(actualIndex >= 0 ? actualIndex : 0);
    setCurrentScrollIndex(actualIndex >= 0 ? actualIndex : 0);
    setShowFullScreen(true);
    
    // Track which video is playing
    handleVideoPlay(attachment.id || attachment.url);
    onAttachmentPress?.(attachment, actualIndex >= 0 ? actualIndex : 0);
  }, [safeAttachments, handleVideoPlay, onAttachmentPress]);

  // Cleanup video players when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup function - video players will be automatically cleaned up by expo-video
    };
  }, []);

  // Generate a unique key for this media's expanded state
  const getExpandedStateKey = useCallback(() => {
    if (!safeAttachments || safeAttachments.length === 0) return null;
    const attachmentIds = safeAttachments
      .map((att) => att.id)
      .sort()
      .join("-");
    return `media_expanded_${attachmentIds}`;
  }, [safeAttachments]);

  // Load expanded state from AsyncStorage
  useEffect(() => {
    const loadExpandedState = async () => {
      try {
        const key = getExpandedStateKey();
        if (key) {
          const savedState = await AsyncStorage.getItem(key);
          if (savedState) {
            setIsExpanded(JSON.parse(savedState));
          }
        }
      } catch (error) {
        console.warn('Error loading expanded state:', error);
      }
    };

    loadExpandedState();
  }, [getExpandedStateKey]);

  // Save expanded state to AsyncStorage
  const saveExpandedState = useCallback(async (expanded: boolean) => {
    try {
      const key = getExpandedStateKey();
      if (key) {
        await AsyncStorage.setItem(key, JSON.stringify(expanded));
      }
    } catch (error) {
      console.warn('Error saving expanded state:', error);
    }
  }, [getExpandedStateKey]);

  // Handle expand/collapse toggle
  const handleToggleExpanded = useCallback(async () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    await saveExpandedState(newExpandedState);
  }, [isExpanded, saveExpandedState]);

  // Early return if no attachments
  if (!attachments || !Array.isArray(attachments) || safeAttachments.length === 0) {
    return null;
  }

  const renderImagePreview = (attachment: T, index: number) => (
    <TouchableOpacity
      style={[styles.fullWidthMediaPreview, index > 0 && styles.mediaSpacing]}
      onPress={() => {
        const actualIndex = safeAttachments.findIndex(att => att.id === attachment.id);
        setSelectedAttachment(attachment);
        setSelectedIndex(actualIndex >= 0 ? actualIndex : 0);
        setCurrentScrollIndex(actualIndex >= 0 ? actualIndex : 0);
        setShowFullScreen(true);
        onAttachmentPress?.(attachment, actualIndex >= 0 ? actualIndex : 0);
      }}
      activeOpacity={0.7}
      key={`image-${attachment.id || index}`}
    >
      <Image
        source={{ uri: attachment.url }}
        style={styles.fullWidthPreviewImage}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  const renderVideoPreview = (attachment: T, index: number) => {
    const videoId = attachment.id || attachment.url;
    const isMuted = mutedStates[videoId] ?? false;
    
    const player = getVideoPlayer(attachment);

    const toggleAudio = () => {
      if (player) {
        const newMutedState = !isMuted;
        player.muted = newMutedState;
        setMutedStates((prev: Record<string, boolean>) => ({
          ...prev,
          [videoId]: newMutedState
        }));
        setAudioToggleKey(prev => prev + 1);
      }
    };

    return (
      <TouchableOpacity
        style={[styles.fullWidthMediaPreview, index > 0 && styles.mediaSpacing]}
        onPress={() => {
          handleModalOpen(attachment);
        }}
        activeOpacity={0.7}
        key={`video-${attachment.id || index}`}
      >
        <View style={styles.videoThumbnailContainer}>
          {player && (
            <VideoView
              key={`video-thumbnail-${modalKey}-${attachment.id || attachment.url}-${Date.now()}`}
              player={player}
              style={styles.videoThumbnail}
              contentFit="contain"
              nativeControls={true}
              allowsFullscreen={true}
            />
          )}
        </View>
        
        {/* Play button overlay */}
        <TouchableOpacity
          style={styles.videoOverlay}
          onPress={() => {
            handleModalOpen(attachment);
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="play-circle-filled" size={48} color="#fff" />
        </TouchableOpacity>
        
        {/* Audio toggle button */}
        <TouchableOpacity
          style={[styles.audioButton, { position: 'absolute', top: 10, right: 10 }]}
          onPress={toggleAudio}
          activeOpacity={0.7}
        >
          <MaterialIcons
            key={`audio-icon-${audioToggleKey}-${isMuted ? 'muted' : 'unmuted'}`}
            name={isMuted ? "volume-off" : "volume-up"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderAudioPreview = (attachment: T) => (
    <TouchableOpacity
      style={styles.audioPreview}
      onPress={() => {
        // Handle audio press
      }}
    >
      <MaterialIcons name="audiotrack" size={24} color="#4f8cff" />
      <View style={styles.audioInfo}>
        <Text style={styles.audioTitle} numberOfLines={1}>
          {attachment.fileName || 'Audio File'}
        </Text>
        <Text style={styles.audioSize}>
          {attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}
        </Text>
      </View>
      <MaterialIcons name="play-arrow" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderMediaGrid = (
    mediaItems: T[],
    showAll: boolean = false
  ) => {
    const displayItems = showAll ? mediaItems : mediaItems.slice(0, maxPreviewCount);
    const hasMoreItems = mediaItems.length > maxPreviewCount;

    return (
      <View style={styles.fullWidthMediaContainer}>
        {displayItems.map((item, index) => {
          if (renderCustomContent) {
            return renderCustomContent(item, index);
          }

          switch (item.type) {
            case "image":
              return renderImagePreview(item, index);
            case "video":
              return renderVideoPreview(item, index);
            case "audio":
              return renderAudioPreview(item);
            default:
              return null;
          }
        })}

        {/* Show more button */}
        {!showAll && hasMoreItems && (
          <TouchableOpacity
            style={[styles.showMoreButton, { marginTop: 8 }]}
            onPress={handleToggleExpanded}
          >
            <Text style={styles.showMoreText}>
              Show {mediaItems.length - maxPreviewCount} more
            </Text>
          </TouchableOpacity>
        )}

        {/* Show less button */}
        {showAll && hasMoreItems && (
          <TouchableOpacity
            style={[styles.showMoreButton, { marginTop: 8 }]}
            onPress={handleToggleExpanded}
          >
            <Text style={styles.showMoreText}>Show less</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFullScreenModal = () => (
    <Modal
      visible={showFullScreen}
      transparent={true}
      animationType="fade"
      onRequestClose={handleModalClose}
    >
      <View style={styles.fullScreenContainer}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleModalClose}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.7}
          accessibilityLabel="Close media viewer"
          accessibilityRole="button"
        >
          <MaterialIcons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Gallery indicator */}
        {safeAttachments.length > 1 && (
          <View style={styles.galleryIndicator}>
            <Text style={styles.galleryIndicatorText}>
              Swipe to view all {safeAttachments.length} items
            </Text>
          </View>
        )}

        {/* Fallback close area - tap outside to close */}
        <TouchableOpacity
          style={styles.fallbackCloseArea}
          onPress={handleModalClose}
          activeOpacity={1}
        />

        {selectedAttachment && (
          <ScrollView 
            ref={scrollViewRef}
            style={styles.fullScreenContent}
            contentContainerStyle={styles.fullScreenContentContainer}
            showsVerticalScrollIndicator={false}
            horizontal={safeAttachments.length > 1}
            pagingEnabled={safeAttachments.length > 1}
            showsHorizontalScrollIndicator={false}
            contentOffset={safeAttachments.length > 1 ? { x: (selectedIndex + 1) * screenWidth, y: 0 } : undefined}
            onMomentumScrollEnd={safeAttachments.length > 1 ? (event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              let actualIndex = newIndex - 1;
              
              if (actualIndex < 0) {
                actualIndex = safeAttachments.length - 1;
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ x: safeAttachments.length * screenWidth, animated: false });
                }, 0);
              } else if (actualIndex >= safeAttachments.length) {
                actualIndex = 0;
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ x: screenWidth, animated: false });
                }, 0);
              }
              
              setCurrentScrollIndex(actualIndex);
              
              setTimeout(() => {
                setShowCounter(true);
              }, 1000);
            } : undefined}
            onScroll={safeAttachments.length > 1 ? (event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              let actualIndex = newIndex - 1;
              
              if (actualIndex < 0) {
                actualIndex = safeAttachments.length - 1;
              } else if (actualIndex >= safeAttachments.length) {
                actualIndex = 0;
              }
              
              setCurrentScrollIndex(actualIndex);
            } : undefined}
            onScrollBeginDrag={safeAttachments.length > 1 ? () => {
              setShowCounter(false);
            } : undefined}
            scrollEventThrottle={16}
          >
            {/* Clone last item at the beginning - only for multiple items */}
            {safeAttachments.length > 1 && safeAttachments.slice(-1).map((attachment, _index) => (
              <View key={`clone-last-${attachment.id}`} style={styles.fullScreenItem}>
                {attachment.type === "image" && (
                  <Image
                    source={{ uri: attachment.url }}
                    style={styles.fullScreenImage}
                    resizeMode="cover"
                  />
                )}
                {attachment.type === "video" && (() => {
                  const player = getVideoPlayer(attachment);
                  const videoId = attachment.id || attachment.url;
                  const isMuted = mutedStates[videoId] ?? false;
                  
                  const toggleAudio = () => {
                    if (player) {
                      const newMutedState = !isMuted;
                      player.muted = newMutedState;
                      setMutedStates((prev: Record<string, boolean>) => ({
                        ...prev,
                        [videoId]: newMutedState
                      }));
                    }
                  };
                  
                  return player ? (
                    <View style={[styles.fullScreenVideo, { backgroundColor: '#000' }]}>
                      <VideoView
                        key={`video-fullscreen-${modalKey}-${modalOpeningKey}-${attachment.id || attachment.url}-${Date.now()}-${showFullScreen ? 'open' : 'closed'}`}
                        player={player}
                        style={styles.fullScreenVideo}
                        contentFit="contain"
                        nativeControls={true}
                        allowsFullscreen={true}
                      />
                      {/* Audio toggle button for full screen */}
                      <TouchableOpacity
                        style={[styles.audioButton, { position: 'absolute', top: 10, right: 10 }]}
                        onPress={toggleAudio}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons 
                          name={isMuted ? "volume-off" : "volume-up"} 
                          size={24} 
                          color="#fff" 
                        />
                      </TouchableOpacity>
                    </View>
                  ) : null;
                })()}
              </View>
            ))}
            
            {/* Original items */}
            {safeAttachments.map((attachment, index) => (
              <View key={attachment.id || index} style={[
                styles.fullScreenItem,
                safeAttachments.length === 1 && styles.singleItemContainer
              ]}>
                {attachment.type === "image" && (
                  <Image
                    source={{ uri: attachment.url }}
                    style={[
                      styles.fullScreenImage,
                      safeAttachments.length === 1 && styles.singleItemImage
                    ]}
                    resizeMode="cover"
                  />
                )}
                {attachment.type === "video" && (() => {
                  const player = getVideoPlayer(attachment);
                  const videoId = attachment.id || attachment.url;
                  const isMuted = mutedStates[videoId] ?? false;
                  
                  const toggleAudio = () => {
                    if (player) {
                      const newMutedState = !isMuted;
                      player.muted = newMutedState;
                      setMutedStates((prev: Record<string, boolean>) => ({
                        ...prev,
                        [videoId]: newMutedState
                      }));
                    }
                  };
                  
                  return player ? (
                    <View style={[
                      styles.fullScreenVideo, 
                      { backgroundColor: '#000' },
                      safeAttachments.length === 1 && styles.singleItemVideo
                    ]}>
                      <VideoView
                        key={`video-fullscreen-${modalKey}-${modalOpeningKey}-${attachment.id || attachment.url}-${Date.now()}-${showFullScreen ? 'open' : 'closed'}`}
                        player={player}
                        style={[
                          styles.fullScreenVideo,
                          safeAttachments.length === 1 && styles.singleItemVideo
                        ]}
                        contentFit="contain"
                        nativeControls={true}
                        allowsFullscreen={true}
                      />
                      {/* Audio toggle button for full screen */}
                      <TouchableOpacity
                        style={[styles.audioButton, { position: 'absolute', top: 10, right: 10 }]}
                        onPress={toggleAudio}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons 
                          name={isMuted ? "volume-off" : "volume-up"} 
                          size={24} 
                          color="#fff" 
                        />
                      </TouchableOpacity>
                    </View>
                  ) : null;
                })()}
              </View>
            ))}
            
            {/* Clone first item at the end - only for multiple items */}
            {safeAttachments.length > 1 && safeAttachments.slice(0, 1).map((attachment, _index) => (
              <View key={`clone-first-${attachment.id}`} style={styles.fullScreenItem}>
                {attachment.type === "image" && (
                  <Image
                    source={{ uri: attachment.url }}
                    style={styles.fullScreenImage}
                    resizeMode="cover"
                  />
                )}
                {attachment.type === "video" && (() => {
                  const player = getVideoPlayer(attachment);
                  const videoId = attachment.id || attachment.url;
                  const isMuted = mutedStates[videoId] ?? false;
                  
                  const toggleAudio = () => {
                    if (player) {
                      const newMutedState = !isMuted;
                      player.muted = newMutedState;
                      setMutedStates((prev: Record<string, boolean>) => ({
                        ...prev,
                        [videoId]: newMutedState
                      }));
                    }
                  };
                  
                  return player ? (
                    <View style={[styles.fullScreenVideo, { backgroundColor: '#000' }]}>
                      <VideoView
                        key={`video-fullscreen-${modalKey}-${modalOpeningKey}-${attachment.id || attachment.url}-${Date.now()}-${showFullScreen ? 'open' : 'closed'}`}
                        player={player}
                        style={styles.fullScreenVideo}
                        contentFit="contain"
                        nativeControls={true}
                        allowsFullscreen={true}
                      />
                      {/* Audio toggle button for full screen */}
                      <TouchableOpacity
                        style={[styles.audioButton, { position: 'absolute', top: 10, right: 10 }]}
                        onPress={toggleAudio}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons 
                          name={isMuted ? "volume-off" : "volume-up"} 
                          size={24} 
                          color="#fff" 
                        />
                      </TouchableOpacity>
                    </View>
                  ) : null;
                })()}
              </View>
            ))}
          </ScrollView>
        )}

        {/* Counter at bottom */}
        {selectedAttachment && safeAttachments.length > 1 && showCounter && (
          <View style={styles.fullScreenInfoContainer}>
            <Text style={styles.attachmentCounter}>
              {currentScrollIndex + 1} / {safeAttachments.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Images and Videos */}
      {(safeAttachments.filter(item => item.type === 'image').length > 0 || 
        safeAttachments.filter(item => item.type === 'video').length > 0) && (
        renderMediaGrid(safeAttachments, isExpanded)
      )}

      {/* Audio Files */}
      {safeAttachments.filter(item => item.type === 'audio').length > 0 && (
        <View style={styles.audioContainer}>
          {safeAttachments.filter(item => item.type === 'audio').map((audio, index) => (
            <View key={`audio-${audio.id || index}`}>
              {renderAudioPreview(audio)}
            </View>
          ))}
        </View>
      )}

      {renderFullScreenModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  fullWidthMediaContainer: {
    marginBottom: 8,
  },
  fullWidthMediaPreview: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  mediaSpacing: {
    marginTop: 12,
  },
  fullWidthPreviewImage: {
    width: "100%",
    height: 180,
  },
  audioContainer: {
    marginTop: 8,
  },
  audioPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9ff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  audioInfo: {
    flex: 1,
    marginLeft: 12,
  },
  audioTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  audioSize: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  videoThumbnailContainer: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#333",
  },
  videoThumbnail: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  audioButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 8,
  },
  showMoreButton: {
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  showMoreText: {
    fontSize: 12,
    color: "#666",
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 9999,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 25,
    padding: 12,
    minWidth: 50,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryIndicator: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 1000,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  galleryIndicatorText: {
    color: "#fff",
    fontSize: 12,
  },
  fullScreenContent: {
    flex: 1,
  },
  fullScreenContentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenItem: {
    width: screenWidth,
    alignItems: "center",
  },
  fullScreenImage: {
    width: screenWidth,
    height: screenWidth,
  },
  fullScreenVideo: {
    width: screenWidth,
    aspectRatio: 16/9,
    backgroundColor: '#000',
  },
  fullScreenInfoContainer: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  attachmentCounter: {
    color: "#fff",
    fontSize: 14,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  fallbackCloseArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1, // Ensure it's behind other content
  },
  singleItemContainer: {
    width: screenWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  singleItemImage: {
    width: screenWidth,
    height: screenWidth,
  },
  singleItemVideo: {
    width: screenWidth,
    aspectRatio: 16/9,
  },
}); 