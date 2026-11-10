
package com.example.demo.service;

import com.example.demo.dto.request.MemberProfileRequest;
import com.example.demo.dto.request.MemberRequest;
import com.example.demo.dto.response.MemberProfileResponse;
import com.example.demo.dto.response.MemberResponse;
import com.example.demo.entity.Member;
import com.example.demo.entity.User;
import com.example.demo.entity.enums.BorrowStatus;
import com.example.demo.repository.BorrowRecordRepository;
import com.example.demo.repository.MemberRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.specification.MemberSpecification;
import com.example.demo.util.DateUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final BorrowRecordRepository borrowRecordRepository;

    private static final Pattern VIETNAM_PHONE_PATTERN =
            Pattern.compile("^(0\\d{9}|\\+84\\d{9})$");

    private static final DateTimeFormatter ISO_DATE_FORMATTER =
            DateTimeFormatter.ofPattern("uuuu-MM-dd")
                    .withResolverStyle(ResolverStyle.STRICT);

    private static final DateTimeFormatter SLASH_DATE_FORMATTER =
            DateTimeFormatter.ofPattern("uuuu/MM/dd")
                    .withResolverStyle(ResolverStyle.STRICT);

    // ========================= SEARCH =========================

    /**
     * Tương thích với các đoạn code và test cũ sử dụng 8 tham số.
     * Phương thức cũ chỉ chấp nhận định dạng yyyy/MM/dd.
     */
    @Transactional(readOnly = true)
    public Page<MemberResponse> searchMembers(
            String name,
            String email,
            String birthFrom,
            String birthTo,
            Long bookId,
            Boolean isVerified,
            int page,
            int size) {

        validateLegacySearchDate(
                birthFrom,
                "Ngày 'từ' không đúng định dạng yyyy/MM/dd"
        );

        validateLegacySearchDate(
                birthTo,
                "Ngày 'đến' không đúng định dạng yyyy/MM/dd"
        );

        if (StringUtils.hasText(birthFrom)
                && StringUtils.hasText(birthTo)) {

            LocalDate from = LocalDate.parse(
                    birthFrom.trim(),
                    SLASH_DATE_FORMATTER
            );

            LocalDate to = LocalDate.parse(
                    birthTo.trim(),
                    SLASH_DATE_FORMATTER
            );

            if (from.isAfter(to)) {
                throw new IllegalArgumentException(
                        "Ngày bắt đầu không được lớn hơn ngày kết thúc."
                );
            }
        }

        return searchMembers(
                name,
                email,
                null,
                null,
                birthFrom,
                birthTo,
                bookId,
                isVerified,
                page,
                size
        );
    }

    /**
     * Kiểm tra ngày theo định dạng cũ để bảo toàn hành vi của test hiện tại.
     */
    private void validateLegacySearchDate(
            String value,
            String errorMessage) {

        if (!StringUtils.hasText(value)) {
            return;
        }

        String dateText = value.trim();

        try {
            if (!dateText.matches("\\d{4}/\\d{2}/\\d{2}")) {
                throw new DateTimeParseException(
                        "Invalid date format",
                        dateText,
                        0
                );
            }

            LocalDate.parse(dateText, SLASH_DATE_FORMATTER);

        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException(errorMessage);
        }
    }

    /**
     * Tìm kiếm đầy đủ, hỗ trợ thêm số điện thoại và địa chỉ.
     * Chấp nhận cả yyyy/MM/dd và yyyy-MM-dd.
     */
    @Transactional(readOnly = true)
    public Page<MemberResponse> searchMembers(
            String name,
            String email,
            String phoneNumber,
            String address,
            String birthFrom,
            String birthTo,
            Long bookId,
            Boolean isVerified,
            int page,
            int size) {

        birthFrom = normalizeSearchDate(
                birthFrom,
                "Ngày bắt đầu"
        );

        birthTo = normalizeSearchDate(
                birthTo,
                "Ngày kết thúc"
        );

        if (birthFrom != null && birthTo != null) {
            LocalDate from = DateUtils.parseDate(birthFrom);
            LocalDate to = DateUtils.parseDate(birthTo);

            if (from.isAfter(to)) {
                throw new IllegalArgumentException(
                        "Ngày bắt đầu không được lớn hơn ngày kết thúc."
                );
            }
        }

        if (page < 0) {
            throw new IllegalArgumentException(
                    "Số trang không được nhỏ hơn 0"
            );
        }

        if (size < 1) {
            throw new IllegalArgumentException(
                    "Kích thước trang phải lớn hơn 0"
            );
        }

        size = Math.min(size, 10);

        Page<Member> members = memberRepository.findAll(
                MemberSpecification.search(
                        name,
                        email,
                        phoneNumber,
                        address,
                        birthFrom,
                        birthTo,
                        bookId,
                        isVerified
                ),
                PageRequest.of(page, size)
        );

        return members.map(this::mapToResponse);
    }

    private String normalizeSearchDate(
            String value,
            String fieldName) {

        if (!StringUtils.hasText(value)) {
            return null;
        }

        String dateText = value.trim();

        try {
            LocalDate date;

            if (dateText.matches("\\d{4}-\\d{2}-\\d{2}")) {
                date = LocalDate.parse(
                        dateText,
                        ISO_DATE_FORMATTER
                );
            } else if (dateText.matches("\\d{4}/\\d{2}/\\d{2}")) {
                date = LocalDate.parse(
                        dateText,
                        SLASH_DATE_FORMATTER
                );
            } else {
                throw new DateTimeParseException(
                        "Invalid date format",
                        dateText,
                        0
                );
            }

            return date.format(SLASH_DATE_FORMATTER);

        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException(
                    fieldName
                            + " không hợp lệ. Định dạng được chấp nhận: "
                            + "yyyy/MM/dd hoặc yyyy-MM-dd."
            );
        }
    }

    // ========================= ADMIN CREATE / UPDATE =========================

    @Transactional
    public MemberResponse createMember(MemberRequest request) {

        String fullName = normalizeRequired(
                request.getFullName(),
                "Họ tên"
        );

        String phoneNumber = normalizeRequired(
                request.getPhoneNumber(),
                "Số điện thoại"
        );

        String address = normalizeRequired(
                request.getAddress(),
                "Địa chỉ"
        );

        validateFullName(fullName);
        validatePhoneNumber(phoneNumber);
        validateAddress(address);

        LocalDate dateOfBirth = parseMemberDate(
                request.getDateOfBirth()
        );

        if (request.getUserId() == null) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn tài khoản người dùng."
            );
        }

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Tài khoản User không tồn tại."
                        )
                );

        if (!user.isVerified()) {
            throw new IllegalArgumentException(
                    "Chỉ được tạo hồ sơ cho tài khoản đã xác thực email."
            );
        }

        // Kiểm tra cả Member đã xóa mềm vì user_id có ràng buộc UNIQUE.
        if (memberRepository.findByUserId(user.getId()).isPresent()) {
            throw new IllegalArgumentException(
                    "Tài khoản này đã có hồ sơ độc giả. "
                            + "Hãy cập nhật hoặc khôi phục hồ sơ hiện có."
            );
        }

        Member member = new Member();
        member.setUser(user);
        member.setFullName(fullName);
        member.setDateOfBirth(dateOfBirth);
        member.setPhoneNumber(phoneNumber);
        member.setAddress(address);
        member.setDeleted(false);
        member.setDeletedAt(null);

        return mapToResponse(memberRepository.save(member));
    }

    @Transactional
    public MemberResponse updateMember(
            Long id,
            MemberRequest request) {

        Member member = memberRepository
                .findByIdAndDeletedFalse(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy thành viên."
                        )
                );

        String fullName = normalizeRequired(
                request.getFullName(),
                "Họ tên"
        );

        String phoneNumber = normalizeRequired(
                request.getPhoneNumber(),
                "Số điện thoại"
        );

        String address = normalizeRequired(
                request.getAddress(),
                "Địa chỉ"
        );

        validateFullName(fullName);
        validatePhoneNumber(phoneNumber);
        validateAddress(address);

        LocalDate dateOfBirth = parseMemberDate(
                request.getDateOfBirth()
        );

        member.setFullName(fullName);
        member.setDateOfBirth(dateOfBirth);
        member.setPhoneNumber(phoneNumber);
        member.setAddress(address);

        // Không thay đổi User liên kết khi cập nhật Member.
        return mapToResponse(memberRepository.save(member));
    }

    private String normalizeRequired(
            String value,
            String fieldName) {

        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException(
                    fieldName + " không được để trống."
            );
        }

        return value.trim();
    }

    private void validateFullName(String fullName) {
        if (fullName.length() > 100) {
            throw new IllegalArgumentException(
                    "Họ tên không được vượt quá 100 ký tự."
            );
        }
    }

    private void validatePhoneNumber(String phoneNumber) {
        if (!VIETNAM_PHONE_PATTERN.matcher(phoneNumber).matches()) {
            throw new IllegalArgumentException(
                    "Số điện thoại phải có dạng 0xxxxxxxxx "
                            + "hoặc +84xxxxxxxxx."
            );
        }
    }

    private void validateAddress(String address) {
        if (address.length() > 255) {
            throw new IllegalArgumentException(
                    "Địa chỉ không được vượt quá 255 ký tự."
            );
        }
    }

    /**
     * Nhận cả yyyy-MM-dd từ input type=date và yyyy/MM/dd.
     */
    private LocalDate parseMemberDate(String value) {

        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException(
                    "Ngày sinh không được để trống."
            );
        }

        String dateText = value.trim();

        try {
            LocalDate date;

            if (dateText.matches("\\d{4}-\\d{2}-\\d{2}")) {
                date = LocalDate.parse(
                        dateText,
                        ISO_DATE_FORMATTER
                );
            } else if (dateText.matches("\\d{4}/\\d{2}/\\d{2}")) {
                date = LocalDate.parse(
                        dateText,
                        SLASH_DATE_FORMATTER
                );
            } else {
                throw new DateTimeParseException(
                        "Invalid date format",
                        dateText,
                        0
                );
            }

            if (!date.isBefore(LocalDate.now())) {
                throw new IllegalArgumentException(
                        "Ngày sinh phải nhỏ hơn ngày hiện tại."
                );
            }

            return date;

        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException(
                    "Ngày sinh không hợp lệ. "
                            + "Định dạng: yyyy-MM-dd hoặc yyyy/MM/dd."
            );
        }
    }

    // ========================= SOFT DELETE / RESTORE =========================

    @Transactional
    public void deleteMember(Long id) {

        Member member = memberRepository
                .findByIdAndDeletedFalse(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy thành viên."
                        )
                );

        List<BorrowStatus> unreturnedStatuses = List.of(
                BorrowStatus.BORROWING,
                BorrowStatus.OVERDUE
        );

        if (borrowRecordRepository.existsByMemberIdAndStatusIn(
                id,
                unreturnedStatuses)) {

            throw new IllegalArgumentException(
                    "Không thể xóa độc giả này vì đang có "
                            + "sách mượn chưa trả!"
            );
        }

        member.setDeleted(true);
        member.setDeletedAt(LocalDateTime.now());

        memberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> getDeletedMembers() {
        return memberRepository.findAllByDeletedTrue()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public MemberResponse restoreMember(Long id) {

        Member member = memberRepository
                .findByIdAndDeletedTrue(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy thành viên trong thùng rác."
                        )
                );

        member.setDeleted(false);
        member.setDeletedAt(null);

        return mapToResponse(memberRepository.save(member));
    }

    // ========================= MY PROFILE =========================

    @Transactional(readOnly = true)
    public MemberProfileResponse getMyProfile(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy tài khoản đang đăng nhập."
                        )
                );

        Member member = memberRepository
                .findByUserId(user.getId())
                .orElse(null);

        if (member == null) {
            return MemberProfileResponse.builder()
                    .email(user.getEmail())
                    .isVerified(user.isVerified())
                    .build();
        }

        return mapToProfileResponse(member);
    }

    @Transactional
    public MemberProfileResponse updateMyProfile(
            String email,
            MemberProfileRequest request) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy tài khoản đang đăng nhập."
                        )
                );

        String fullName = request.getFullName() == null
                ? ""
                : request.getFullName().trim();

        String dateText = request.getDateOfBirth() == null
                ? ""
                : request.getDateOfBirth().trim();

        String phoneNumber = request.getPhoneNumber() == null
                ? ""
                : request.getPhoneNumber().trim();

        String address = request.getAddress() == null
                ? ""
                : request.getAddress().trim();

        if (!StringUtils.hasText(fullName)) {
            throw new IllegalArgumentException(
                    "Họ và tên là bắt buộc."
            );
        }

        validateFullName(fullName);

        LocalDate dateOfBirth = parseMemberDate(dateText);

        validatePhoneNumber(phoneNumber);

        if (!StringUtils.hasText(address)) {
            throw new IllegalArgumentException(
                    "Địa chỉ là bắt buộc."
            );
        }

        validateAddress(address);

        // Tìm cả Member đã xóa mềm để tránh tạo trùng user_id.
        Member member = memberRepository
                .findByUserId(user.getId())
                .orElse(null);

        if (member == null) {
            member = new Member();
            member.setUser(user);
        }

        member.setDeleted(false);
        member.setDeletedAt(null);
        member.setFullName(fullName);
        member.setDateOfBirth(dateOfBirth);
        member.setPhoneNumber(phoneNumber);
        member.setAddress(address);

        return mapToProfileResponse(
                memberRepository.save(member)
        );
    }

    @Transactional(readOnly = true)
    public boolean isProfileCompleteForEmail(String email) {

        if (!StringUtils.hasText(email)) {
            return false;
        }

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            return false;
        }

        Member member = memberRepository
                .findByUserIdAndDeletedFalse(user.getId())
                .orElse(null);

        return isProfileComplete(member);
    }

    private boolean isProfileComplete(Member member) {

        return member != null
                && !member.isDeleted()
                && StringUtils.hasText(member.getFullName())
                && member.getDateOfBirth() != null
                && member.getDateOfBirth().isBefore(LocalDate.now())
                && StringUtils.hasText(member.getPhoneNumber())
                && VIETNAM_PHONE_PATTERN.matcher(
                        member.getPhoneNumber().trim()
                ).matches()
                && StringUtils.hasText(member.getAddress())
                && member.getAddress().trim().length() <= 255;
    }

    // ========================= MAPPERS =========================

    private MemberProfileResponse mapToProfileResponse(Member member) {

        User user = member.getUser();

        return MemberProfileResponse.builder()
                .id(member.getId())
                .fullName(member.getFullName())
                .dateOfBirth(member.getDateOfBirth())
                .phoneNumber(member.getPhoneNumber())
                .address(member.getAddress())
                .email(user.getEmail())
                .isVerified(user.isVerified())
                .build();
    }

    private MemberResponse mapToResponse(Member member) {

        return MemberResponse.builder()
                .id(member.getId())
                .fullName(member.getFullName())
                .dateOfBirth(member.getDateOfBirth())
                .phoneNumber(member.getPhoneNumber())
                .address(member.getAddress())
                .email(
                        member.getUser() != null
                                ? member.getUser().getEmail()
                                : null
                )
                .isVerified(
                        member.getUser() != null
                                && member.getUser().isVerified()
                )
                .build();
    }
}
