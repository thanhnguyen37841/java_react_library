package com.example.demo.service;

import com.example.demo.exception.ConflictException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.dto.request.ChangeEmailRequest;
import com.example.demo.dto.request.ChangePasswordRequest;
import com.example.demo.dto.request.ConfirmChangeEmailRequest;
import com.example.demo.dto.request.ForgotPasswordRequest;
import com.example.demo.dto.request.ResetPasswordRequest;
import com.example.demo.entity.ChangeEmailToken;
import com.example.demo.entity.PasswordResetToken;
import com.example.demo.entity.User;
import com.example.demo.repository.ChangeEmailTokenRepository;
import com.example.demo.repository.PasswordResetTokenRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.PasswordPolicy;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final ChangeEmailTokenRepository changeEmailTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    /**
     * Bước 1: Yêu cầu đặt lại mật khẩu.
     */
    @Transactional
    public String forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy tài khoản với email này."));

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setToken(UUID.randomUUID().toString());
        resetToken.setExpiryDate(LocalDateTime.now().plusMinutes(15));

        passwordResetTokenRepository.save(resetToken);

        mailService.sendPasswordResetEmail(
                user.getEmail(),
                resetToken.getToken());

        return "Vui lòng kiểm tra email để đặt lại mật khẩu.";
    }

    /**
     * Bước 2: Đặt lại mật khẩu bằng token.
     */
    @Transactional
    public String resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken =
                passwordResetTokenRepository.findByToken(request.getToken())
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Token không hợp lệ hoặc không tồn tại."));

        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            passwordResetTokenRepository.delete(resetToken);

            throw new IllegalArgumentException(
                    "Token đã hết hạn. Vui lòng yêu cầu lại.");
        }

        // Kiểm tra độ mạnh của mật khẩu và mật khẩu xác nhận.
        PasswordPolicy.validate(
                request.getNewPassword(),
                request.getConfirmPassword());

        User user = resetToken.getUser();

        // Mã hóa mật khẩu trước khi lưu vào cơ sở dữ liệu.
        user.setPassword(
                passwordEncoder.encode(request.getNewPassword()));

        userRepository.save(user);

        // Token chỉ được sử dụng một lần.
        passwordResetTokenRepository.delete(resetToken);

        return "Đặt lại mật khẩu thành công!";
    }

    /**
     * Đổi mật khẩu khi người dùng đã đăng nhập.
     */
    @Transactional
    public String changePassword(
            String currentUsername,
            ChangePasswordRequest request) {

        User user = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy user."));

        // Xác minh mật khẩu hiện tại.
        if (!passwordEncoder.matches(
                request.getOldPassword(),
                user.getPassword())) {

            throw new IllegalArgumentException(
                    "Mật khẩu cũ không chính xác.");
        }

        // Kiểm tra mật khẩu mới và mật khẩu xác nhận.
        PasswordPolicy.validate(
                request.getNewPassword(),
                request.getConfirmPassword());

        // Mã hóa mật khẩu mới bằng BCrypt thông qua PasswordEncoder.
        user.setPassword(
                passwordEncoder.encode(request.getNewPassword()));

        userRepository.save(user);

        return "Đổi mật khẩu thành công!";
    }

    /**
     * Bước 1: Yêu cầu đổi email.
     * Mã xác thực được gửi tới email mới.
     */
    @Transactional
    public String requestChangeEmail(
            String currentEmail,
            ChangeEmailRequest request) {

        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy user."));

        if (userRepository.findByEmail(request.getNewEmail()).isPresent()) {
            throw new ConflictException(
                    "Email này đã được sử dụng bởi tài khoản khác.");
        }

        // Xóa mã cũ để chỉ giữ một mã xác thực đang có hiệu lực.
        changeEmailTokenRepository.deleteByUser(user);

        String code = generateSixDigitCode();

        ChangeEmailToken token = new ChangeEmailToken();
        token.setUser(user);
        token.setNewEmail(request.getNewEmail());
        token.setCode(code);
        token.setExpiryDate(LocalDateTime.now().plusMinutes(15));

        changeEmailTokenRepository.save(token);

        mailService.sendChangeEmailCode(
                request.getNewEmail(),
                code);

        return "Mã xác thực đã được gửi tới email mới. "
                + "Vui lòng kiểm tra hộp thư và xác nhận trong 15 phút.";
    }

    /**
     * Bước 2: Xác nhận mã và cập nhật email.
     */
    @Transactional
    public String confirmChangeEmail(
            String currentEmail,
            ConfirmChangeEmailRequest request) {

        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy user."));

        ChangeEmailToken token =
                changeEmailTokenRepository.findByUserAndCode(
                        user,
                        request.getCode())
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Mã xác thực không đúng."));

        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            changeEmailTokenRepository.delete(token);

            throw new IllegalArgumentException(
                    "Mã xác thực đã hết hạn. Vui lòng yêu cầu lại.");
        }

        // Kiểm tra email mới chưa bị tài khoản khác sử dụng.
        boolean emailUsed = userRepository
                .findByEmail(token.getNewEmail())
                .filter(existingUser -> !existingUser.getId()
                        .equals(user.getId()))
                .isPresent();

        if (emailUsed) {
            throw new ConflictException(
                    "Email này đã được sử dụng bởi tài khoản khác.");
        }

        user.setEmail(token.getNewEmail());
        userRepository.save(user);

        changeEmailTokenRepository.delete(token);

        return "Đổi email thành công! "
                + "Vui lòng đăng nhập lại bằng email mới.";
    }

    /**
     * Sinh mã xác thực gồm 6 chữ số.
     */
    private String generateSixDigitCode() {
        SecureRandom random = new SecureRandom();

        return String.format(
                "%06d",
                random.nextInt(1_000_000));
    }
}
