package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_permission_overrides")
@Getter
@Setter
@NoArgsConstructor
@IdClass(UserPermissionOverride.UserPermissionOverrideId.class)
public class UserPermissionOverride {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "permission_id", nullable = false)
    private Permission permission;

    @Column(nullable = false, columnDefinition = "TINYINT")
    private boolean granted;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Getter
    @NoArgsConstructor
    public static class UserPermissionOverrideId implements Serializable {

        private Long user;
        private Long permission;

        public UserPermissionOverrideId(Long user, Long permission) {
            this.user = user;
            this.permission = permission;
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (!(obj instanceof UserPermissionOverrideId)) return false;

            UserPermissionOverrideId that = (UserPermissionOverrideId) obj;

            return java.util.Objects.equals(user, that.user)
                    && java.util.Objects.equals(permission, that.permission);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(user, permission);
        }
    }
}