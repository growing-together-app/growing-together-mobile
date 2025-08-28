import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ScreenOrientation from 'expo-screen-orientation';
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

// Sanitization utility function to prevent XSS
const sanitizeText = (text: string | undefined | null): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Remove any HTML tags and potentially dangerous characters
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove remaining < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// URL validation utility
const isValidUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    const parsedUrl = new URL(url);
    // Only allow http, https, and data URLs
    return ['http:', 'https:', 'data:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

// Generic attachment interface
interface BaseAttachment {
  id?: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  fileName?: string;
  fileSize?: number;
}

interface MediaViewerBaseProps<T extends BaseAttachment> {
  attachments: T[];
  maxPreviewCount?: number;
  onAttachmentPress?: (attachment: T, index: number) => void;
  renderCustomContent?: (_attachment: T, _index: number) => React.ReactNode;
  enableOrientationControl?: boolean; // Optional flag to enable/disable orientation features
}

const { width: screenWidth } = Dimensions.get("window");
const MAX_PREVIEW_COUNT = 2; // Show only 2 items initially

// Generate stable keys for video components
const generateVideoKey = (attachment: BaseAttachment, prefix: string = 'video') => {
  return `${prefix}-${attachment.id || attachment.url}`;
};

// Separate VideoPlayer component to prevent re-renders
const VideoPlayer = React.memo(({ uri, onPress }: { uri: string; onPress?: () => void }) => {
  const player = useVideoPlayer({ uri }, (player) => {
    player.loop = false;
    player.muted = false;
    player.volume = 1.0;
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <VideoView
        player={player}
        style={styles.fullWidthMediaPreview}
        contentFit="cover"
      />
    </TouchableOpacity>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

// Custom hook to manage video players efficiently
const useVideoPlayers = (videoAttachments: BaseAttachment[]) => {
  // Only create players for actual video attachments
  const videoUrls = useMemo(() => 
    videoAttachments.map(att => att.url).filter(Boolean), 
    [videoAttachments]
  );
  
  // Always call useVideoPlayer to follow React Hooks rules
  const player1 = useVideoPlayer({ uri: videoUrls[0] || '' }, (player) => {
    if (videoUrls[0]) {
      player.loop = false;
      player.muted = false;
      player.volume = 1.0;
    }
  });
  
  const player2 = useVideoPlayer({ uri: videoUrls[1] || '' }, (player) => {
    if (videoUrls[1]) {
      player.loop = false;
      player.muted = false;
      player.volume = 1.0;
    }
  });
  
  const player3 = useVideoPlayer({ uri: videoUrls[2] || '' }, (player) => {
    if (videoUrls[2]) {
      player.loop = false;
      player.muted = false;
      player.volume = 1.0;
    }
  });
  
  const player4 = useVideoPlayer({ uri: videoUrls[3] || '' }, (player) => {
    if (videoUrls[3]) {
      player.loop = false;
      player.muted = false;
      player.volume = 1.0;
    }
  });
  
  const player5 = useVideoPlayer({ uri: videoUrls[4] || '' }, (player) => {
    if (videoUrls[4]) {
      player.loop = false;
      player.muted = false;
      player.volume = 1.0;
    }
  });
  
  // Return memoized array to prevent unnecessary re-renders
  return useMemo(() => [
    videoUrls[0] ? player1 : null,
    videoUrls[1] ? player2 : null,
    videoUrls[2] ? player3 : null,
    videoUrls[3] ? player4 : null,
    videoUrls[4] ? player5 : null
  ].filter(Boolean), 
    [player1, player2, player3, player4, player5, videoUrls]
  );
};

function MediaViewerBase<T extends BaseAttachment>({
  attachments,
  maxPreviewCount = MAX_PREVIEW_COUNT,
  onAttachmentPress,
  renderCustomContent,
  enableOrientationControl = false, // Default to false for safety
}: MediaViewerBaseProps<T>) {
  // Memoize attachments to prevent unnecessary re-renders
  const memoizedAttachments = useMemo(() => attachments, [attachments]);
  const [selectedAttachment, setSelectedAttachment] =
    useState<T | null>(null);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [currentScrollIndex, setCurrentScrollIndex] = useState<number>(0);
  const [showCounter, setShowCounter] = useState<boolean>(true);
  const [modalKey, setModalKey] = useState<number>(0);

  const [isExpanded, setIsExpanded] = useState(false);
  const [mutedStates, setMutedStates] = useState<Record<string, boolean>>({}); // Track muted state per video
  const [modalOpeningKey, setModalOpeningKey] = useState<number>(0); // Track when modal is opening
  const [isLandscape, setIsLandscape] = useState<boolean>(false); // Track orientation state
  const [_originalOrientation, setOriginalOrientation] = useState<number | null>(null); // Store original orientation
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Ensure attachments are valid and have required fields
  const safeAttachments = useMemo(() => {
    if (!memoizedAttachments || !Array.isArray(memoizedAttachments)) {
  
      return [];
    }
    
    const filtered = memoizedAttachments
      .filter((att) => att && att.url && att.type)
      .sort((a, b) => {
        // Sort images first, then videos, then audio
        const typeOrder = { image: 0, video: 1, audio: 2 };
        return typeOrder[a.type] - typeOrder[b.type];
      });
    

    
    return filtered;
  }, [memoizedAttachments]);

  // Create video players for all video attachments at the top level
  const videoAttachments = useMemo(() => 
    safeAttachments.filter(att => att.type === 'video'), 
    [safeAttachments]
  );
  
  // Use custom hook for video players
  const players = useVideoPlayers(videoAttachments);
  
  const videoPlayers = useMemo(() => 
    videoAttachments.map((attachment, index) => ({
      attachment: {
        ...attachment,
        // Use URL as fallback ID if attachment.id is undefined
        id: attachment.id || attachment.url
      },
      player: players[index] || null
    })), [videoAttachments, players]
  );



  // Helper function to get video player
  const getVideoPlayer = useCallback((attachment: T) => {
    // If attachment has no ID, match by URL only
    if (!attachment.id) {
      const videoPlayer = videoPlayers.find(vp => vp.attachment.url === attachment.url);
      

      
      return videoPlayer?.player || null;
    }
    
    // If attachment has ID, try to match by ID first, then by URL
    const videoPlayer = videoPlayers.find(vp => 
      vp.attachment.id === attachment.id || vp.attachment.url === attachment.url
    );
    

    
    return videoPlayer?.player || null;
  }, [videoPlayers]);

  // Orientation handling functions
  const lockToLandscape = useCallback(async () => {
    try {
      // Check if ScreenOrientation is available
      if (!ScreenOrientation || !ScreenOrientation.getOrientationAsync) {
        console.warn('MediaViewerBase: ScreenOrientation not available');
        return;
      }
      
      // Store current orientation before changing
      const currentOrientation = await ScreenOrientation.getOrientationAsync();
      setOriginalOrientation(currentOrientation);
      
      // Lock to landscape
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsLandscape(true);

    } catch (error) {
      console.warn('MediaViewerBase: Failed to lock to landscape:', error);
      // Fallback - just set the state without actually changing orientation
      setIsLandscape(true);
    }
  }, []);

  const unlockOrientation = useCallback(async () => {
    try {
      // Check if ScreenOrientation is available
      if (!ScreenOrientation || !ScreenOrientation.unlockAsync) {
        console.warn('MediaViewerBase: ScreenOrientation not available');
        return;
      }
      
      // Unlock orientation to allow all orientations
      await ScreenOrientation.unlockAsync();
      setIsLandscape(false);

    } catch (error) {
      console.warn('MediaViewerBase: Failed to unlock orientation:', error);
      // Fallback - just set the state without actually changing orientation
      setIsLandscape(false);
    }
  }, []);



  // Stop all videos when modal closes
  const handleModalClose = useCallback(() => {

    setShowFullScreen(false);
    
    // Unlock orientation when modal closes (only if enabled)
    if (enableOrientationControl) {
      unlockOrientation();
    }
    
    // Force remount of video components by updating modal key
    setModalKey(prev => {
      const newKey = prev + 1;

      return newKey;
    });
  }, [unlockOrientation, enableOrientationControl]);

  // Reset video player when modal opens
  const handleModalOpen = useCallback((attachment: T) => {
    
    // Force video player reset by incrementing modalOpeningKey
    setModalOpeningKey(prev => {
      const newKey = prev + 1;

      return newKey;
    });

    
    const actualIndex = safeAttachments.findIndex(att => att.id === attachment.id);
    setSelectedAttachment(attachment);
    setSelectedIndex(actualIndex >= 0 ? actualIndex : 0);
    setCurrentScrollIndex(actualIndex >= 0 ? actualIndex : 0);
    setShowFullScreen(true);
    
    // Lock to landscape for video full-screen experience (only if enabled)
    if (attachment.type === 'video' && enableOrientationControl) {
      lockToLandscape();
    }
    
    onAttachmentPress?.(attachment, actualIndex >= 0 ? actualIndex : 0);
  }, [safeAttachments, onAttachmentPress, lockToLandscape, enableOrientationControl]);

  // Cleanup video players when component unmounts or attachments change
  useEffect(() => {
    return () => {
      // Cleanup function - video players will be automatically cleaned up by expo-video
      // Also unlock orientation when component unmounts (only if enabled)
      if (enableOrientationControl) {
        unlockOrientation();
      }
    };
  }, [unlockOrientation, enableOrientationControl]);

  // Generate a unique key for this media's expanded state
  const getExpandedStateKey = useCallback(() => {
    if (!safeAttachments || safeAttachments.length === 0) return null;
    // Use the first attachment's ID or a combination of attachment IDs
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
    const isMuted = mutedStates[videoId] ?? false; // Default to false (unmuted)
    
    
    // Get video player using the helper function
    const player = getVideoPlayer(attachment);

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

    return (
      <TouchableOpacity
        style={[styles.fullWidthMediaPreview, index > 0 && styles.mediaSpacing]}
        onPress={() => {
          handleModalOpen(attachment);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.videoThumbnailContainer}>
          {player && (
            <VideoView
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
        // Handle audio playback if needed

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
          const key = item.id || `${item.type}-${index}`;
          
          if (renderCustomContent) {
            return (
              <View key={key}>
                {renderCustomContent(item, index)}
              </View>
            );
          }

          switch (item.type) {
            case "image":
              return (
                <View key={key}>
                  {renderImagePreview(item, index)}
                </View>
              );
            case "video":
              return (
                <View key={key}>
                  {renderVideoPreview(item, index)}
                </View>
              );
            case "audio":
              return (
                <View key={key}>
                  {renderAudioPreview(item)}
                </View>
              );
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
      <View style={[
        styles.fullScreenContainer,
        isLandscape && styles.fullScreenContainerLandscape
      ]}>
        <TouchableOpacity
          style={[
            styles.closeButton,
            isLandscape && styles.closeButtonLandscape
          ]}
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
              
              // Handle infinite scroll
              if (actualIndex < 0) {
                actualIndex = safeAttachments.length - 1;
                // Jump to the last real item
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ x: safeAttachments.length * screenWidth, animated: false });
                }, 0);
              } else if (actualIndex >= safeAttachments.length) {
                actualIndex = 0;
                // Jump to the first real item
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({ x: screenWidth, animated: false });
                }, 0);
              }
              
              setCurrentScrollIndex(actualIndex);
              
              // Show counter again after scrolling stops
              setTimeout(() => {
                setShowCounter(true);
              }, 1000); // Show after 1 second of no scrolling
            } : undefined}
            onScroll={safeAttachments.length > 1 ? (event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              let actualIndex = newIndex - 1;
              
              // Handle infinite scroll
              if (actualIndex < 0) {
                actualIndex = safeAttachments.length - 1;
              } else if (actualIndex >= safeAttachments.length) {
                actualIndex = 0;
              }
              
              setCurrentScrollIndex(actualIndex);
            } : undefined}
            onScrollBeginDrag={safeAttachments.length > 1 ? () => {
              // Hide counter when user starts scrolling
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
        renderMediaGrid(safeAttachments, isExpanded) // Use full safeAttachments array to preserve indices
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
    height: 180, // Increased height to show more of the image
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
  fullScreenContainerLandscape: {
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
  closeButtonLandscape: {
    top: 20,
    right: 20,
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
    aspectRatio: 16/9, // Use aspectRatio instead of hard-coded height
    backgroundColor: '#000', // Black background for any small borders
  },
  fullScreenVideoLandscape: {
    width: '100%',
    height: '100%',
    aspectRatio: undefined, // Remove aspect ratio constraint in landscape
  },
  audioButtonLandscape: {
    top: 20,
    right: 20,
  },
  fullScreenToggleButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 8,
  },
  fullScreenToggleButtonLandscape: {
    top: 20,
    left: 20,
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
    backgroundColor: '#000',
  },
}); 

// Memoize the component to prevent unnecessary re-renders
export default React.memo(MediaViewerBase) as typeof MediaViewerBase;