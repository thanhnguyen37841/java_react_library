
package com.example.demo.dto.response;

public record DashboardStatsResponse(
        long totalBookTitles,
        long totalBookCopies,
        long availableCopies,
        long outOfStockTitles,
        long totalMembers,
        long verifiedMembers,
        long newMembersLast30Days,
        long totalBorrowRecords,
        long pendingRequests,
        long currentlyBorrowed,
        long overdueRecords,
        long returnedRecords
) {
}
