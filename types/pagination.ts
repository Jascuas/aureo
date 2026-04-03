/**
 * Pagination types for server-side paginated tables
 */

export type PaginationInfo = {
  /** Whether there is a next page available */
  hasNextPage: boolean;
  /** Whether there is a previous page available (from cache) */
  hasPreviousPage: boolean;
  /** Whether the initial data is loading */
  isLoading: boolean;
  /** Whether the next page is being fetched */
  isFetchingNextPage: boolean;
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of items loaded so far */
  totalItemsLoaded: number;
};

export type PaginationCallbacks = {
  /** Callback to navigate to the next page */
  onNextPage: () => void;
  /** Callback to navigate to the previous page */
  onPreviousPage: () => void;
};
