
package com.example.demo.service;

import com.example.demo.dto.request.MemberRequest;
import com.example.demo.dto.response.MemberResponse;
import com.example.demo.entity.Member;
import com.example.demo.entity.User;
import com.example.demo.entity.enums.BorrowStatus;
import com.example.demo.repository.BorrowRecordRepository;
import com.example.demo.repository.MemberRepository;
import com.example.demo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MemberServiceTest {

    @Mock private MemberRepository memberRepository;
    @Mock private UserRepository userRepository;
    @Mock private BorrowRecordRepository borrowRecordRepository;

    @InjectMocks private MemberService memberService;

    private Member member;
    private User user;
    private MemberRequest request;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(10L);
        user.setEmail("user@gmail.com");
        user.setVerified(true);

        member = new Member();
        member.setId(1L);
        member.setFullName("Nguyen Van A");
        member.setDateOfBirth(LocalDate.of(2000, 1, 1));
        member.setUser(user);

        request = new MemberRequest();
        request.setFullName("Nguyen Van A");
        request.setDateOfBirth("2000/01/01");
        request.setPhoneNumber("0901234567");
        request.setAddress("TP. Hồ Chí Minh");
        request.setUserId(10L);
    }

    @Test
    void searchMembers_Success() {
        Page<Member> page = new PageImpl<>(
                List.of(member), PageRequest.of(0, 10), 1);

        when(memberRepository.findAll(
                any(Specification.class), eq(PageRequest.of(0, 10))))
                .thenReturn(page);

        Page<MemberResponse> result = memberService.searchMembers(
                "Nguyen", "user@gmail.com", null, null,
                null, true, 0, 10);

        assertEquals(1, result.getTotalElements());
        assertEquals("Nguyen Van A", result.getContent().get(0).getFullName());
        assertEquals("user@gmail.com", result.getContent().get(0).getEmail());
        assertTrue(result.getContent().get(0).isVerified());
    }

    @Test
    void searchMembers_EmptyResult() {
        when(memberRepository.findAll(
                any(Specification.class), eq(PageRequest.of(0, 10))))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        Page<MemberResponse> result = memberService.searchMembers(
                null, null, null, null, null, null, 0, 10);

        assertTrue(result.getContent().isEmpty());
        assertEquals(0, result.getTotalElements());
    }

    @Test
    void searchMembers_InvalidBirthFrom() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> memberService.searchMembers(
                        null, null, "2000-01-01", null,
                        null, null, 0, 10));

        assertEquals("Ngày 'từ' không đúng định dạng yyyy/MM/dd",
                ex.getMessage());
        verifyNoInteractions(memberRepository);
    }

    @Test
    void searchMembers_InvalidBirthTo() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> memberService.searchMembers(
                        null, null, null, "2000-01-01",
                        null, null, 0, 10));

        assertEquals("Ngày 'đến' không đúng định dạng yyyy/MM/dd",
                ex.getMessage());
        verifyNoInteractions(memberRepository);
    }

    @Test
    void searchMembers_BirthFromGreaterThanBirthTo() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> memberService.searchMembers(
                        null, null, "2000/02/01", "2000/01/01",
                        null, null, 0, 10));

        assertEquals("Ngày bắt đầu không được lớn hơn ngày kết thúc.",
                ex.getMessage());
        verifyNoInteractions(memberRepository);
    }

    @Test
    void searchMembers_LimitsPageSizeTo10() {
        when(memberRepository.findAll(
                any(Specification.class), eq(PageRequest.of(0, 10))))
                .thenReturn(new PageImpl<>(
                        List.of(member), PageRequest.of(0, 10), 1));

        Page<MemberResponse> result = memberService.searchMembers(
                null, null, null, null, null, null, 0, 20);

        assertEquals(1, result.getTotalElements());
        verify(memberRepository).findAll(
                any(Specification.class), eq(PageRequest.of(0, 10)));
    }

    @Test
    void searchMembers_NegativePage_ThrowsException() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> memberService.searchMembers(
                        null, null, null, null, null, null, -1, 10));

        assertEquals("Số trang không được nhỏ hơn 0", ex.getMessage());
        verifyNoInteractions(memberRepository);
    }

    @Test
    void searchMembers_InvalidSize_ThrowsException() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> memberService.searchMembers(
                        null, null, null, null, null, null, 0, 0));

        assertEquals("Kích thước trang phải lớn hơn 0", ex.getMessage());
        verifyNoInteractions(memberRepository);
    }

    @Test
    void createMember_Success() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(memberRepository.findByUserId(10L)).thenReturn(Optional.empty());
        when(memberRepository.save(any(Member.class)))
                .thenAnswer(invocation -> {
                    Member saved = invocation.getArgument(0);
                    saved.setId(1L);
                    return saved;
                });

        MemberResponse result = memberService.createMember(request);

        assertEquals(1L, result.getId());
        assertEquals("Nguyen Van A", result.getFullName());
        assertEquals("user@gmail.com", result.getEmail());
        assertTrue(result.isVerified());

        verify(memberRepository).findByUserId(10L);
        verify(memberRepository).save(any(Member.class));
    }

    @Test
    void createMember_WithoutUser() {
        request.setUserId(null);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> memberService.createMember(request)
        );

        assertEquals("Vui lòng chọn tài khoản người dùng.", exception.getMessage());
        verifyNoInteractions(userRepository);
        verify(memberRepository, never()).save(any(Member.class));
    }

    @Test
    void createMember_UserNotFound() {
        request.setUserId(999L);
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> memberService.createMember(request));

        assertEquals("Tài khoản User không tồn tại.", ex.getMessage());
        verify(memberRepository, never()).save(any(Member.class));
    }

    @Test
    void createMember_UserAlreadyHasMember_ThrowsException() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(memberRepository.findByUserId(10L)).thenReturn(Optional.of(member));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> memberService.createMember(request));

        assertTrue(ex.getMessage().contains("đã có hồ sơ độc giả"));
        verify(memberRepository, never()).save(any(Member.class));
    }

    @Test
    void updateMember_Success() {
        when(memberRepository.findByIdAndDeletedFalse(1L))
                .thenReturn(Optional.of(member));
        when(memberRepository.save(member)).thenReturn(member);

        request.setFullName("Nguyen Van B");
        request.setDateOfBirth("2000/02/02");

        MemberResponse result = memberService.updateMember(1L, request);

        assertEquals(1L, result.getId());
        assertEquals("Nguyen Van B", result.getFullName());
        assertEquals(LocalDate.of(2000, 2, 2), member.getDateOfBirth());
        verify(memberRepository).save(member);
    }

    @Test
    void updateMember_NotFound() {
        when(memberRepository.findByIdAndDeletedFalse(999L))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> memberService.updateMember(999L, request));

        assertEquals("Không tìm thấy thành viên.", ex.getMessage());
        verify(memberRepository, never()).save(any(Member.class));
    }

    @Test
    void deleteMember_Success_SoftDeletesMember() {
        when(memberRepository.findByIdAndDeletedFalse(1L))
                .thenReturn(Optional.of(member));
        when(borrowRecordRepository.existsByMemberIdAndStatusIn(
                eq(1L), anyList())).thenReturn(false);
        when(memberRepository.save(member)).thenReturn(member);

        memberService.deleteMember(1L);

        assertTrue(member.isDeleted());
        assertNotNull(member.getDeletedAt());
        verify(memberRepository).save(member);
        verify(memberRepository, never()).delete(any(Member.class));
    }

    @Test
    void deleteMember_NotFound() {
        when(memberRepository.findByIdAndDeletedFalse(999L))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> memberService.deleteMember(999L));

        assertEquals("Không tìm thấy thành viên.", ex.getMessage());
        verify(memberRepository, never()).save(any(Member.class));
        verifyNoInteractions(borrowRecordRepository);
    }

    @Test
    void deleteMember_FailsWhenMemberHasUnreturnedBook() {
        when(memberRepository.findByIdAndDeletedFalse(1L))
                .thenReturn(Optional.of(member));
        when(borrowRecordRepository.existsByMemberIdAndStatusIn(
                eq(1L), anyList())).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> memberService.deleteMember(1L));

        assertEquals(
                "Không thể xóa độc giả này vì đang có sách mượn chưa trả!",
                ex.getMessage());
        assertFalse(member.isDeleted());
        verify(memberRepository, never()).save(any(Member.class));
    }

    @Test
    void restoreMember_Success() {
        member.setDeleted(true);
        member.setDeletedAt(java.time.LocalDateTime.now());

        when(memberRepository.findByIdAndDeletedTrue(1L))
                .thenReturn(Optional.of(member));
        when(memberRepository.save(member)).thenReturn(member);

        MemberResponse result = memberService.restoreMember(1L);

        assertEquals(1L, result.getId());
        assertFalse(member.isDeleted());
        assertNull(member.getDeletedAt());
        verify(memberRepository).save(member);
    }

    @Test
    void restoreMember_NotFound() {
        when(memberRepository.findByIdAndDeletedTrue(99L))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> memberService.restoreMember(99L));

        assertEquals("Không tìm thấy thành viên trong thùng rác.",
                ex.getMessage());
        verify(memberRepository, never()).save(any(Member.class));
    }
}
