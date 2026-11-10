
package com.example.demo.service;

import com.example.demo.dto.request.*;
import com.example.demo.entity.ChangeEmailToken;
import com.example.demo.entity.PasswordResetToken;
import com.example.demo.entity.User;
import com.example.demo.repository.ChangeEmailTokenRepository;
import com.example.demo.repository.PasswordResetTokenRepository;
import com.example.demo.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private ChangeEmailTokenRepository changeEmailTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private MailService mailService;

    @InjectMocks private AccountService accountService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setEmail("user@gmail.com");
        user.setPassword("encoded_old_password");
    }

    @Test
    void changePassword_Success_UpdatesPassword() {
        when(userRepository.findByEmail("user@gmail.com"))
                .thenReturn(Optional.of(user));
        when(passwordEncoder.matches("OldPass123!", "encoded_old_password"))
                .thenReturn(true);
        when(passwordEncoder.encode("SecureNew123!"))
                .thenReturn("encoded_new_password");

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setOldPassword("OldPass123!");
        request.setNewPassword("SecureNew123!");
        request.setConfirmPassword("SecureNew123!");

        String result = accountService.changePassword("user@gmail.com", request);

        assertEquals("Đổi mật khẩu thành công!", result);
        assertEquals("encoded_new_password", user.getPassword());
        verify(userRepository).save(user);
    }

    @Test
    void changePassword_Fail_WhenOldPasswordIncorrect() {
        when(userRepository.findByEmail("user@gmail.com"))
                .thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongOld123!", "encoded_old_password"))
                .thenReturn(false);

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setOldPassword("WrongOld123!");
        request.setNewPassword("SecureNew123!");
        request.setConfirmPassword("SecureNew123!");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> accountService.changePassword("user@gmail.com", request));

        assertEquals("Mật khẩu cũ không chính xác.", ex.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void changePassword_Fail_WhenUserNotFound() {
        when(userRepository.findByEmail("missing@gmail.com"))
                .thenReturn(Optional.empty());

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setOldPassword("OldPass123!");
        request.setNewPassword("SecureNew123!");
        request.setConfirmPassword("SecureNew123!");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> accountService.changePassword("missing@gmail.com", request));

        assertEquals("Không tìm thấy user.", ex.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void changePassword_Fail_WhenNewPasswordConfirmationDoesNotMatch() {
        when(userRepository.findByEmail("user@gmail.com"))
                .thenReturn(Optional.of(user));
        when(passwordEncoder.matches("OldPass123!", "encoded_old_password"))
                .thenReturn(true);

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setOldPassword("OldPass123!");
        request.setNewPassword("SecureNew123!");
        request.setConfirmPassword("Different123!");

        assertThrows(RuntimeException.class,
                () -> accountService.changePassword("user@gmail.com", request));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void forgotPassword_Success_CreatesTokenAndSendsEmail() {
        when(userRepository.findByEmail("user@gmail.com"))
                .thenReturn(Optional.of(user));

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("user@gmail.com");

        String result = accountService.forgotPassword(request);

        assertEquals("Vui lòng kiểm tra email để đặt lại mật khẩu.", result);

        ArgumentCaptor<PasswordResetToken> captor =
                ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(passwordResetTokenRepository).save(captor.capture());

        PasswordResetToken token = captor.getValue();
        assertEquals(user, token.getUser());
        assertNotNull(token.getToken());
        assertFalse(token.getToken().isBlank());
        assertTrue(token.getExpiryDate().isAfter(LocalDateTime.now()));

        verify(mailService).sendPasswordResetEmail("user@gmail.com", token.getToken());
    }

    @Test
    void forgotPassword_Fail_WhenUserNotFound() {
        when(userRepository.findByEmail("missing@gmail.com"))
                .thenReturn(Optional.empty());

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("missing@gmail.com");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> accountService.forgotPassword(request));

        assertEquals("Không tìm thấy tài khoản với email này.", ex.getMessage());
        verify(passwordResetTokenRepository, never()).save(any());
        verify(mailService, never()).sendPasswordResetEmail(anyString(), anyString());
    }

    @Test
    void resetPassword_Success_UpdatesPasswordAndDeletesToken() {
        PasswordResetToken token = new PasswordResetToken();
        token.setToken("reset-token");
        token.setUser(user);
        token.setExpiryDate(LocalDateTime.now().plusMinutes(10));

        when(passwordResetTokenRepository.findByToken("reset-token"))
                .thenReturn(Optional.of(token));
        when(passwordEncoder.encode("SecureNew123!"))
                .thenReturn("encoded_new_password");

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("reset-token");
        request.setNewPassword("SecureNew123!");
        request.setConfirmPassword("SecureNew123!");

        String result = accountService.resetPassword(request);

        assertEquals("Đặt lại mật khẩu thành công!", result);
        assertEquals("encoded_new_password", user.getPassword());
        verify(userRepository).save(user);
        verify(passwordResetTokenRepository).delete(token);
    }

    @Test
    void resetPassword_Fail_WhenTokenNotFound() {
        when(passwordResetTokenRepository.findByToken("invalid-token"))
                .thenReturn(Optional.empty());

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("invalid-token");
        request.setNewPassword("SecureNew123!");
        request.setConfirmPassword("SecureNew123!");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> accountService.resetPassword(request));

        assertEquals("Token không hợp lệ hoặc không tồn tại.", ex.getMessage());
        verify(userRepository, never()).save(any(User.class));
        verify(passwordResetTokenRepository, never()).delete(any(PasswordResetToken.class));
    }

    @Test
    void resetPassword_Fail_WhenTokenExpired() {
        PasswordResetToken token = new PasswordResetToken();
        token.setToken("expired-token");
        token.setUser(user);
        token.setExpiryDate(LocalDateTime.now().minusMinutes(1));

        when(passwordResetTokenRepository.findByToken("expired-token"))
                .thenReturn(Optional.of(token));

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("expired-token");
        request.setNewPassword("SecureNew123!");
        request.setConfirmPassword("SecureNew123!");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> accountService.resetPassword(request));

        assertEquals("Token đã hết hạn. Vui lòng yêu cầu lại.", ex.getMessage());
        verify(passwordResetTokenRepository).delete(token);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void resetPassword_Fail_WhenConfirmationDoesNotMatch() {
        PasswordResetToken token = new PasswordResetToken();
        token.setToken("reset-token");
        token.setUser(user);
        token.setExpiryDate(LocalDateTime.now().plusMinutes(10));

        when(passwordResetTokenRepository.findByToken("reset-token"))
                .thenReturn(Optional.of(token));

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("reset-token");
        request.setNewPassword("SecureNew123!");
        request.setConfirmPassword("Different123!");

        assertThrows(RuntimeException.class,
                () -> accountService.resetPassword(request));

        verify(userRepository, never()).save(any(User.class));
        verify(passwordResetTokenRepository, never()).delete(token);
    }

    @Test
    void requestChangeEmail_Success_CreatesCodeAndSendsEmail() {
        when(userRepository.findByEmail("user@gmail.com"))
                .thenReturn(Optional.of(user));
        when(userRepository.findByEmail("new@gmail.com"))
                .thenReturn(Optional.empty());

        ChangeEmailRequest request = new ChangeEmailRequest();
        request.setNewEmail("new@gmail.com");

        String result = accountService.requestChangeEmail("user@gmail.com", request);

        assertEquals(
                "Mã xác thực đã được gửi tới email mới. Vui lòng kiểm tra hộp thư và xác nhận trong 15 phút.",
                result);

        verify(changeEmailTokenRepository).deleteByUser(user);

        ArgumentCaptor<ChangeEmailToken> captor =
                ArgumentCaptor.forClass(ChangeEmailToken.class);
        verify(changeEmailTokenRepository).save(captor.capture());

        ChangeEmailToken token = captor.getValue();
        assertEquals(user, token.getUser());
        assertEquals("new@gmail.com", token.getNewEmail());
        assertTrue(token.getCode().matches("\\d{6}"));
        assertTrue(token.getExpiryDate().isAfter(LocalDateTime.now()));

        verify(mailService).sendChangeEmailCode("new@gmail.com", token.getCode());
    }

    @Test
    void requestChangeEmail_Fail_WhenUserNotFound() {
        when(userRepository.findByEmail("missing@gmail.com"))
                .thenReturn(Optional.empty());

        ChangeEmailRequest request = new ChangeEmailRequest();
        request.setNewEmail("new@gmail.com");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> accountService.requestChangeEmail("missing@gmail.com", request));

        assertEquals("Không tìm thấy user.", ex.getMessage());
        verify(changeEmailTokenRepository, never()).save(any());
        verify(mailService, never()).sendChangeEmailCode(anyString(), anyString());
    }

    @Test
    void requestChangeEmail_Fail_WhenNewEmailAlreadyUsed() {
        User anotherUser = new User();
        anotherUser.setId(2L);
        anotherUser.setEmail("new@gmail.com");

        when(userRepository.findByEmail("user@gmail.com"))
                .thenReturn(Optional.of(user));
        when(userRepository.findByEmail("new@gmail.com"))
                .thenReturn(Optional.of(anotherUser));

        ChangeEmailRequest request = new ChangeEmailRequest();
        request.setNewEmail("new@gmail.com");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> accountService.requestChangeEmail("user@gmail.com", request));

        assertEquals("Email này đã được sử dụng bởi tài khoản khác.", ex.getMessage());
        verify(changeEmailTokenRepository, never()).deleteByUser(any());
        verify(changeEmailTokenRepository, never()).save(any());
    }

    @Test
    void confirmChangeEmail_Success_UpdatesEmailAndDeletesToken() {
        ChangeEmailToken token = new ChangeEmailToken();
        token.setUser(user);
        token.setNewEmail("new@gmail.com");
        token.setCode("123456");
        token.setExpiryDate(LocalDateTime.now().plusMinutes(10));

        when(userRepository.findByEmail("user@gmail.com"))
                .thenReturn(Optional.of(user));
        when(changeEmailTokenRepository.findByUserAndCode(user, "123456"))
                .thenReturn(Optional.of(token));
        when(userRepository.findByEmail("new@gmail.com"))
                .thenReturn(Optional.empty());

        ConfirmChangeEmailRequest request = new ConfirmChangeEmailRequest();
        request.setCode("123456");

        String result = accountService.confirmChangeEmail("user@gmail.com", request);

        assertEquals(
                "Đổi email thành công! Vui lòng đăng nhập lại bằng email mới.",
                result);
        assertEquals("new@gmail.com", user.getEmail());
        verify(userRepository).save(user);
        verify(changeEmailTokenRepository).delete(token);
    }

    @Test
    void confirmChangeEmail_Fail_WhenCodeIncorrect() {
        when(userRepository.findByEmail("user@gmail.com"))
                .thenReturn(Optional.of(user));
        when(changeEmailTokenRepository.findByUserAndCode(user, "999999"))
                .thenReturn(Optional.empty());

        ConfirmChangeEmailRequest request = new ConfirmChangeEmailRequest();
        request.setCode("999999");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> accountService.confirmChangeEmail("user@gmail.com", request));

        assertEquals("Mã xác thực không đúng.", ex.getMessage());
        verify(userRepository, never()).save(any(User.class));
        verify(changeEmailTokenRepository, never()).delete(any(ChangeEmailToken.class));
    }

    @Test
    void confirmChangeEmail_Fail_WhenCodeExpired() {
        ChangeEmailToken token = new ChangeEmailToken();
        token.setUser(user);
        token.setNewEmail("new@gmail.com");
        token.setCode("123456");
        token.setExpiryDate(LocalDateTime.now().minusMinutes(1));

        when(userRepository.findByEmail("user@gmail.com"))
                .thenReturn(Optional.of(user));
        when(changeEmailTokenRepository.findByUserAndCode(user, "123456"))
                .thenReturn(Optional.of(token));

        ConfirmChangeEmailRequest request = new ConfirmChangeEmailRequest();
        request.setCode("123456");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> accountService.confirmChangeEmail("user@gmail.com", request));

        assertEquals("Mã xác thực đã hết hạn. Vui lòng yêu cầu lại.", ex.getMessage());
        verify(changeEmailTokenRepository).delete(token);
        verify(userRepository, never()).save(any(User.class));
    }
}
