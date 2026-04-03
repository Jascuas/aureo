import { useState } from "react";

import type { PaginationCallbacks, PaginationInfo } from "@/types/pagination";

import { useGetTransactions } from "./use-get-transactions";

/**
 * Hook for paginated transactions with bidirectional navigation
 * Uses cached pages from React Query for instant "Previous" navigation
 */
export const useGetPaginatedTransactions = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const query = useGetTransactions();

  // Get current page data from the pages array
  const currentPageData = query.data?.pages[pageIndex]?.data || [];

  // Calculate total items loaded so far
  const totalItemsLoaded =
    query.data?.pages.reduce((total, page) => total + page.data.length, 0) || 0;

  // Navigation handlers
  const goToNextPage = () => {
    const totalPages = query.data?.pages.length || 0;

    if (pageIndex < totalPages - 1) {
      // Next page is already cached, just increment index
      setPageIndex(pageIndex + 1);
    } else if (query.hasNextPage && !query.isFetchingNextPage) {
      // Need to fetch next page from server
      query.fetchNextPage().then(() => {
        setPageIndex(pageIndex + 1);
      });
    }
  };

  const goToPreviousPage = () => {
    if (pageIndex > 0) {
      setPageIndex(pageIndex - 1);
    }
  };

  // Pagination info
  const paginationInfo: PaginationInfo = {
    hasNextPage:
      pageIndex < (query.data?.pages.length || 0) - 1 || !!query.hasNextPage,
    hasPreviousPage: pageIndex > 0,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    currentPage: pageIndex + 1,
    totalItemsLoaded,
  };

  // Pagination callbacks
  const paginationCallbacks: PaginationCallbacks = {
    onNextPage: goToNextPage,
    onPreviousPage: goToPreviousPage,
  };

  return {
    transactions: currentPageData,
    paginationInfo,
    paginationCallbacks,
    // Expose original query for additional control
    query,
  };
};
