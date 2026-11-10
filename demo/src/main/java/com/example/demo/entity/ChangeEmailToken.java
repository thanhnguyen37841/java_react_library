package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "change_email_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChangeEmailToken extends BaseEntity {

    @Column(name = "new_email", nullable = false)
    private String newEmail;

    @Column(nullable = false, length = 6)
    private String code;

    @Column(name = "expiry_date", nullable = false)
    private LocalDateTime expiryDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}