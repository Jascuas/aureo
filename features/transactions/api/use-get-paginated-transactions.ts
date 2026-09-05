import { useEffect, useState } from "react";

import type { PaginationCallbacks, PaginationInfo } from "@/types/pagination";

import { useGetTransactions } from "./use-get-transactions";

/**
 * Hook for paginated transactions with bidirectional navigation
 * Uses cached pages from React Query for instant "Previous" navigation
 */
export const useGetPaginatedTransactions = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const { filters, ...query } = useGetTransactions();
  const pageCount = query.data?.pages.length ?? 0;
  const currentPageIndex = Math.min(pageIndex, Math.max(pageCount - 1, 0));

  useEffect(() => {
    setPageIndex(0);
  }, [filters.accountId, filters.from, filters.to]);

  useEffect(() => {
    if (query.isError) {
      setPageIndex(0);
    }
  }, [query.isError]);

  // Get current page data from the pages array
  const currentPageData = query.data?.pages[currentPageIndex]?.data || [];

  // Calculate total items loaded so far
  const totalItemsLoaded =
    query.data?.pages.reduce((total, page) => total + page.data.length, 0) || 0;

  // Navigation handlers
  const goToNextPage = () => {
    const totalPages = pageCount;

    if (currentPageIndex < totalPages - 1) {
      // Next page is already cached, just increment index
      setPageIndex(currentPageIndex + 1);
    } else if (query.hasNextPage && !query.isFetchingNextPage) {
      // Need to fetch next page from server
      void query.fetchNextPage().then((result) => {
        if (!result.isError) {
          setPageIndex(currentPageIndex + 1);
        }
      });
    }
  };

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setPageIndex(currentPageIndex - 1);
    }
  };

  // Pagination info
  const paginationInfo: PaginationInfo = {
    hasNextPage:
      currentPageIndex < pageCount - 1 || !!query.hasNextPage,
    hasPreviousPage: currentPageIndex > 0,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    currentPage: currentPageIndex + 1,
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
