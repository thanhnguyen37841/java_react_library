package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "revoked_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RevokedToken extends BaseEntity {
    @Column(nullable = false, unique = true)
    private String jti;

    @Column(name = "expiry_date", nullable = false)
    private LocalDateTime expiryDate;
}