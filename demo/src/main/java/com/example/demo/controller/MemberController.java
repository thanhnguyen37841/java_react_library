package com.example.demo.controller;

import com.example.demo.dto.request.MemberProfileRequest;
import com.example.demo.dto.request.MemberRequest;
import com.example.demo.dto.response.MemberProfileResponse;
import com.example.demo.dto.response.MemberResponse;
import com.example.demo.service.MemberService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    // Xem và tìm kiếm thành viên chưa bị xóa
    @GetMapping
    @PreAuthorize("hasAuthority('MEMBER_READ')")
    public ResponseEntity<Page<MemberResponse>> searchMembers(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phoneNumber,
            @RequestParam(required = false) String address,
            @RequestParam(required = false) String birthFrom,
            @RequestParam(required = false) String birthTo,
            @RequestParam(required = false) Long bookId,
            @RequestParam(required = false) Boolean isVerified,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        return ResponseEntity.ok(
                memberService.searchMembers(
                        name,
                        email,
                        phoneNumber,
                        address,
                        birthFrom,
                        birthTo,
                        bookId,
                        isVerified,
                        page,
                        size
                )
        );
    }

    // Tạo thành viên
    @PostMapping
    @PreAuthorize("hasAuthority('MEMBER_CREATE')")
    public ResponseEntity<MemberResponse> createMember(
            @Valid @RequestBody MemberRequest request) {

        return ResponseEntity.ok(
                memberService.createMember(request)
        );
    }

    // Cập nhật thành viên
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('MEMBER_UPDATE')")
    public ResponseEntity<MemberResponse> updateMember(
            @PathVariable Long id,
            @Valid @RequestBody MemberRequest request) {

        return ResponseEntity.ok(
                memberService.updateMember(id, request)
        );
    }

    // Xóa mềm thành viên
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('MEMBER_DELETE')")
    public ResponseEntity<String> deleteMember(
            @PathVariable Long id) {

        memberService.deleteMember(id);

        return ResponseEntity.ok(
                "Đã chuyển độc giả vào thùng rác!"
        );
    }

    // Xem danh sách thành viên trong thùng rác
    @GetMapping("/trash")
    @PreAuthorize("hasAuthority('MEMBER_READ')")
    public ResponseEntity<List<MemberResponse>> getDeletedMembers() {

        return ResponseEntity.ok(
                memberService.getDeletedMembers()
        );
    }

    // Khôi phục thành viên từ thùng rác
    @PutMapping("/{id}/restore")
    @PreAuthorize("hasAuthority('MEMBER_UPDATE')")
    public ResponseEntity<MemberResponse> restoreMember(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                memberService.restoreMember(id)
        );
    }

    // Xem hồ sơ cá nhân
    @GetMapping("/me")
    public ResponseEntity<MemberProfileResponse> getMyProfile(
            Authentication authentication) {

        return ResponseEntity.ok(
                memberService.getMyProfile(
                        authentication.getName()
                )
        );
    }

    // Cập nhật hồ sơ cá nhân
    @PutMapping("/me")
    public ResponseEntity<MemberProfileResponse> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody MemberProfileRequest request) {

        return ResponseEntity.ok(
                memberService.updateMyProfile(
                        authentication.getName(),
                        request
                )
        );
    }
}