import { Platform } from 'react-native';

/** Shared FlatList tuning for tab screens with floating bottom bars. */
export const TAB_LIST_PADDING = 100;

export const flatListPerfProps =
  Platform.OS === 'android'
    ? {
        initialNumToRender: 8,
        maxToRenderPerBatch: 10,
        windowSize: 7,
        removeClippedSubviews: true,
      }
    : {
        initialNumToRender: 10,
        windowSize: 10,
      };
