
package com.example.demo.service;

import com.example.demo.dto.response.DashboardStatsResponse;
import com.example.demo.entity.enums.BorrowStatus;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.BorrowRecordRepository;
import com.example.demo.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DashboardStatsService {

    private final BookRepository bookRepository;
    private final MemberRepository memberRepository;
    private final BorrowRecordRepository borrowRecordRepository;

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats() {
        LocalDateTime thirtyDaysAgo =
                LocalDateTime.now().minusDays(30);

        LocalDate today = LocalDate.now();

        long totalBookTitles =
                bookRepository.countByDeletedFalse();

        long totalBookCopies =
                bookRepository.sumTotalCopiesOfActiveBooks();

        long availableCopies =
                bookRepository.sumAvailableCopiesOfActiveBooks();

        long outOfStockTitles =
                bookRepository
                        .countByDeletedFalseAndAvailableQuantity(0);

        long totalMembers =
                memberRepository.countByDeletedFalse();

        long verifiedMembers =
                memberRepository.countVerifiedActiveMembers();

        long newMembersLast30Days =
                memberRepository
                        .countByDeletedFalseAndCreatedAtAfter(
                                thirtyDaysAgo
                        );

        long totalBorrowRecords =
                borrowRecordRepository.count();

        long pendingRequests =
                borrowRecordRepository.countByStatus(
                        BorrowStatus.BORROW_REQUESTED
                );

        long currentlyBorrowed =
                borrowRecordRepository.countByStatus(
                        BorrowStatus.BORROWING
                );

        long explicitlyOverdue =
                borrowRecordRepository.countByStatus(
                        BorrowStatus.OVERDUE
                );

        long borrowingPastDueDate =
                borrowRecordRepository
                        .countByStatusAndDueDateBefore(
                                BorrowStatus.BORROWING,
                                today
                        );

        long overdueRecords =
                explicitlyOverdue + borrowingPastDueDate;

        long returnedRecords =
                borrowRecordRepository.countByStatus(
                        BorrowStatus.RETURNED
                );

        return new DashboardStatsResponse(
                totalBookTitles,
                totalBookCopies,
                availableCopies,
                outOfStockTitles,
                totalMembers,
                verifiedMembers,
                newMembersLast30Days,
                totalBorrowRecords,
                pendingRequests,
                currentlyBorrowed,
                overdueRecords,
                returnedRecords
        );
    }
}
