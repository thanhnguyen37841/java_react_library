package com.example.demo.support;

import com.example.demo.dto.request.BorrowRequest;
import com.example.demo.entity.Book;
import com.example.demo.entity.Member;

public class TestDataFactory {

    public static Member createMockMember(Long id) {
        Member member = new Member();
        member.setId(id);
        member.setFullName("Nguyễn Văn Test");
        return member;
    }

    public static Book createMockBook(Long id, int availableQuantity) {
        Book book = new Book();
        book.setId(id);
        book.setTitle("Clean Code");
        book.setAvailableQuantity(availableQuantity);
        return book;
    }

    public static BorrowRequest createBorrowRequest(Long memberId, Long bookId) {
        BorrowRequest request = new BorrowRequest();
        request.setMemberId(memberId);
        request.setBookId(bookId);
        return request;
    }
}