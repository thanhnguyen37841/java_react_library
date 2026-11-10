package com.example.demo.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender mailSender;

    public void sendVerificationEmail(String to, String token) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(to);
            helper.setSubject("Xác thực tài khoản thư viện");
            
            String verificationLink = "http://localhost:8080/auth/verify?token=" + token;
            String htmlMsg = "<h3>Chào mừng bạn!</h3>"
                    + "<p>Vui lòng click vào đường dẫn bên dưới để xác thực tài khoản của bạn:</p>"
                    + "<a href='" + verificationLink + "'>Xác thực Email</a>";
            
            helper.setText(htmlMsg, true);
            mailSender.send(message);
            log.info("Đã gửi email xác thực tới: {}", to);
        } catch (Exception e) {
            // Bắt Exception thay vì chỉ MessagingException, vì lỗi sai
            // username/password SMTP (MailAuthenticationException) là
            // RuntimeException không checked, không thuộc MessagingException.
            log.error("Lỗi khi gửi email", e);
            throw new RuntimeException("Không thể gửi email xác thực");
        }
    }

    public void sendChangeEmailCode(String to, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject("Xác thực đổi email thư viện");

            String htmlMsg = "<h3>Yêu cầu đổi email</h3>"
                    + "<p>Mã xác thực của bạn là: <b>" + code + "</b></p>"
                    + "<p>Mã có hiệu lực trong 15 phút. Nhập mã này vào hệ thống để xác nhận đổi email.</p>";

            helper.setText(htmlMsg, true);
            mailSender.send(message);
            log.info("Đã gửi mã xác thực đổi email tới: {}", to);
        } catch (Exception e) {
            log.error("Lỗi khi gửi email đổi email", e);
            throw new RuntimeException("Không thể gửi email xác thực đổi email");
        }
    }

    public void sendPasswordResetEmail(String to, String token) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper =
                    new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject("Yêu cầu đặt lại mật khẩu");

            // Mở giao diện Frontend, không gọi trực tiếp API Backend.
            String resetLink =
                    "http://localhost:5173/reset-password?token=" + token;

            String htmlMsg =
                    "<h3>Yêu cầu đặt lại mật khẩu</h3>"
                    + "<p>Bạn đã yêu cầu đặt lại mật khẩu.</p>"
                    + "<p>Vui lòng nhấn liên kết bên dưới để đặt mật khẩu mới. "
                    + "Liên kết có hiệu lực trong 15 phút.</p>"
                    + "<p><a href='" + resetLink
                    + "'>Đặt lại mật khẩu</a></p>"
                    + "<p>Nếu bạn không yêu cầu thao tác này, "
                    + "vui lòng bỏ qua email.</p>";

            helper.setText(htmlMsg, true);
            mailSender.send(message);

            log.info("Đã gửi email reset password tới: {}", to);
        } catch (Exception e) {
            log.error("Lỗi khi gửi email đặt lại mật khẩu", e);
            throw new RuntimeException(
                    "Không thể gửi email đặt lại mật khẩu");
        }
    }

}